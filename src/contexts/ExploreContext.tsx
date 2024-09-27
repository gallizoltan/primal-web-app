import { nip19 } from "../lib/nTools";
import { createStore } from "solid-js/store";
import { getEvents, getExploreFeed } from "../lib/feed";
import { useAccountContext } from "./AccountContext";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan } from "../stores/note";
import { Kind } from "../constants";
import {
  batch,
  createContext,
  createEffect,
  onCleanup,
  useContext
} from "solid-js";
import {
  getLegendStats,
  startListeningForNostrStats,
  stopListeningForNostrStats
} from "../lib/stats";
import {
  decompressBlob,
  isConnected,
  readData,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from "../sockets";
import {
  ContextChildren,
  DVMMetadata,
  DVMStats,
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrEvents,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalDVM,
  PrimalNote,
  PrimalUser,
  PrimalZap,
  TopZap,
} from "../types/primal";
import { APP_ID } from "../App";
import { parseBolt11 } from "../utils";
import { TopicStat } from "../megaFeeds";

export type ExploreContextStore = {
  previewDVM: PrimalDVM | undefined,
  previewDVMStats: DVMStats | undefined,
  previewDVMMetadata: DVMMetadata | undefined,
  explorePeople: PrimalUser[],
  exploreZaps: PrimalZap[],
  exploreMedia: PrimalNote[],
  exploreTopics: TopicStat[],


  notes: PrimalNote[],
  scope: string,
  timeframe: string,
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
  isNetStatsStreamOpen: boolean,
  selectedTab: string,
  stats: {
    users: number,
    pubkeys: number,
    pubnotes: number,
    reactions: number,
    reposts: number,
    any: number,
    zaps: number,
    satszapped: number,
  },
  legend: {
    your_follows: number,
    your_inner_network: number,
    your_outer_network: number,
  },
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, until?: number, limit?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    openNetStatsStream: () => void,
    closeNetStatsStream: () => void,
    fetchLegendStats: (pubkey?: string) => void,

    selectTab: (tab: string) => void,
    setPreviewDVM: (dvm: PrimalDVM, stats: DVMStats | undefined, metadata: DVMMetadata | undefined) => void,
    setExplorePeople: (users: PrimalUser[]) => void,
    setExploreZaps: (zaps: PrimalZap[]) => void,
    setExploreMedia: (zaps: PrimalNote[]) => void,
    setExploreTopics: (topics: TopicStat[]) => void,
  }
}

export const initialExploreData = {
  previewDVM: undefined,
  previewDVMStats: undefined,
  previewDVMMetadata: undefined,
  explorePeople: [],
  exploreZaps: [],
  exploreMedia: [],
  exploreTopics: [],


  notes: [],
  isFetching: false,
  scope: 'global',
  timeframe: 'latest',
  selectedTab: 'feeds',
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
    topZaps: {},
  },
  reposts: {},
  lastNote: undefined,
  isNetStatsStreamOpen: false,
  stats: {
    users: 0,
    pubkeys: 0,
    pubnotes: 0,
    reactions: 0,
    reposts: 0,
    any: 0,
    zaps: 0,
    satszapped: 0,
  },
  legend: {
    your_follows: 0,
    your_inner_network: 0,
    your_outer_network: 0,
  },
};


export const ExploreContext = createContext<ExploreContextStore>();

export const ExploreProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

// ACTIONS --------------------------------------

  const setExplorePeople = (users: PrimalUser[]) => {
    updateStore('explorePeople', () => [...users]);
  }
  const setExploreZaps = (zaps: PrimalZap[]) => {
    updateStore('exploreZaps', () => [...zaps]);
  }
  const setExploreMedia = (notes: PrimalNote[]) => {
    updateStore('exploreMedia', () => [...notes]);
  }
  const setExploreTopics = (topics: TopicStat[]) => {
    updateStore('exploreTopics', () => [...topics]);
  }

  const setPreviewDVM = (dvm: PrimalDVM, stats: DVMStats | undefined, metadata: DVMMetadata | undefined) => {
    batch(() => {
      updateStore('previewDVM', () => ({...dvm}));
      updateStore('previewDVMStats', () => ({...stats}));
      updateStore('previewDVMMetadata', () => ({...metadata}));
    })
  }

  const selectTab = (tab: string) => {
    updateStore('selectedTab', () => tab);
  }

















  const saveNotes = (newNotes: PrimalNote[]) => {

    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, until = 0, limit = 20) => {
    const [scope, timeframe] = topic.split(';');


    if (scope && timeframe) {
      updateStore('isFetching', true);
      updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

      updateStore('scope', () => scope);
      updateStore('timeframe', () => timeframe);

      getExploreFeed(
        account?.publicKey || '',
        `explore_${APP_ID}`,
        scope,
        timeframe,
        until,
        limit,
      );
      return;
    }
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    const criteria = paginationPlan(store.timeframe);

    const noteData: Record<string, any> =  lastNote.repost ?
      lastNote.repost.note :
      lastNote.post;

    const until = noteData[criteria];

    if (until > 0) {
      fetchNotes(
        `${store.scope};${store.timeframe}`,
        until,
      );
    }
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.post?.noteId !== nip19.noteEncode(message.id)) {
        updateStore('page', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      updateStore('page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }

    if (content?.kind === Kind.Zap) {
      const zapTag = content.tags.find(t => t[0] === 'description');

      if (!zapTag) return;

      const zapInfo = JSON.parse(zapTag[1] || '{}');

      let amount = '0';

      let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

      if (bolt11Tag) {
        try {
          amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
        } catch (e) {
          const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

          amount = amountTag ? amountTag[1] : '0';
        }
      }

      const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

      const zap: TopZap = {
        id: zapInfo.id,
        amount: parseInt(amount || '0'),
        pubkey: zapInfo.pubkey,
        message: zapInfo.content,
        eventId,
      };

      const oldZaps = store.page.topZaps[eventId];

      if (oldZaps === undefined) {
        updateStore('page', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
        return;
      }

      if (oldZaps.find(i => i.id === zap.id)) {
        return;
      }

      const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

      updateStore('page', 'topZaps', eventId, () => [ ...newZaps ]);

      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const sort = sortingPlan(store.timeframe);

    const newPosts = sort(convertToNotes(page, page.topZaps));

    saveNotes(newPosts);
  };

  const openNetStatsStream = () => {
    startListeningForNostrStats(APP_ID);
  };

  const closeNetStatsStream = () => {
    stopListeningForNostrStats(APP_ID);
  };

  const fetchLegendStats = (pubkey?: string) => {
    if (!pubkey) {
      return;
    }

    getLegendStats(pubkey, APP_ID);
  };

// SOCKET HANDLERS ------------------------------

  const handleExploreEvent = (content: NostrEventContent) => {
    updatePage(content);
  }
  const handleExploreEose = () => {
    const reposts = parseEmptyReposts(store.page);
    const ids = Object.keys(reposts);

    if (ids.length === 0) {
      savePage(store.page);
      return;
    }

    updateStore('reposts', () => reposts);

    getEvents(account?.publicKey, ids, `explore_reposts_${APP_ID}`);
  }

  const handleExploreRepostEvent = (content: NostrEventContent) => {
    const repostId = (content as NostrNoteContent).id;
    const reposts = store.reposts || {};
    const parent = store.page.messages.find(m => m.id === reposts[repostId]);

    if (parent) {
      updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
    }
  }

  const handleExploreRepostEose = () => {
    savePage(store.page);
  }

  const handleExploreStatsEvent = (content: NostrEventContent) => {
    const stats = JSON.parse(content.content || '{}');

    if (content.kind === Kind.NetStats) {
      updateStore('stats', () => ({ ...stats }));
    }

    if (content.kind === Kind.LegendStats) {
      updateStore('legend', () => ({ ...stats }));
    }
  }

  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, subId, content] = message;

    if (subId === `explore_${APP_ID}`) {
      if (type === 'EVENTS') {
        for (let i=0;i<content.length;i++) {
          const e = content[i];
          handleExploreEvent(e);
        }

        handleExploreEose();
        return;
      }

      if (type === 'EOSE') {
        handleExploreEose()
        return;
      }

      if (type === 'EVENT') {
        handleExploreEvent(content);
        return;
      }
    }

    if ([`netstats_${APP_ID}`, `legendstats_${APP_ID}`].includes(subId)) {
      if (type === 'EVENTS') {
        for (let i=0;i<content.length;i++) {
          const e = content[i];
          handleExploreStatsEvent(e);
        }
      }

      if (type === 'EVENT') {
        handleExploreStatsEvent(content);
      }
    }

    if (subId === `explore_reposts_${APP_ID}`) {
      if (type === 'EVENTS') {
        for (let i=0;i<content.length;i++) {
          const e = content[i];
          handleExploreRepostEvent(e);
        }

        handleExploreRepostEose();
        return;
      }
      if (type === 'EOSE') {
        handleExploreRepostEose();
        return;
      }

      if (type === 'EVENT') {
        handleExploreRepostEvent(content);
        return;
      }
    }
  };

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

// EFFECTS --------------------------------------

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });

// STORES ---------------------------------------

  const [store, updateStore] = createStore<ExploreContextStore>({
    ...initialExploreData,
    actions: {
      saveNotes,
      fetchNotes,
      clearNotes,
      fetchNextPage,
      updatePage,
      savePage,
      openNetStatsStream,
      closeNetStatsStream,
      fetchLegendStats,

      selectTab,
      setPreviewDVM,
      setExplorePeople,
      setExploreZaps,
      setExploreMedia,
      setExploreTopics,
    },
  });

// RENDER ---------------------------------------

  return (
    <ExploreContext.Provider value={store}>
      {props.children}
    </ExploreContext.Provider>
  );
}

export const useExploreContext = () => useContext(ExploreContext);
