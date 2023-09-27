import { A } from '@solidjs/router';
import { Component, createEffect, createSignal, Show } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import ParsedNote from '../ParsedNote/ParsedNote';
import NoteFooter from './NoteFooter/NoteFooter';
import NoteHeader from './NoteHeader/NoteHeader';

import styles from './Note.module.scss';
import { useThreadContext } from '../../contexts/ThreadContext';
import { useIntl } from '@cookbook/solid-intl';
import { truncateNpub } from '../../stores/profile';
import { note as t } from '../../translations';
import { hookForDev } from '../../lib/devTools';
import NoteReplyHeader from './NoteHeader/NoteReplyHeader';

const Note: Component<{ note: PrimalNote, id?: string }> = (props) => {

  const threadContext = useThreadContext();
  const intl = useIntl();

  const repost = () => props.note.repost;

  const navToThread = (note: PrimalNote) => {
    threadContext?.actions.setPrimaryNote(note);
  };

  const reposterName = () => {
    const r = repost();

    if (!r) {
      return '';
    }

    return r.user?.displayName ||
      r.user?.name ||
      truncateNpub(r.user.npub);
  }

  const [openCustomZap, setOpenCustomZap] = createSignal(false);

  createEffect(() => {
    const n = props.note;

    console.log('NOTE: ', n);
    console.log('REPLY: ', n.replyTo);
    console.log('------------------------')
  })

  return (
    <A
      id={props.id}
      class={styles.postLink}
      href={`/e/${props.note?.post.noteId}`}
      onClick={() => navToThread(props.note)}
      data-event={props.note.post.id}
      data-event-bech32={props.note.post.noteId}
    >
      <Show when={repost()}>
        <div class={styles.repostedBy}>
          <div class={styles.repostIcon}></div>
          <span>
            <A href={`/p/${repost()?.user.npub}`} >
              {reposterName()}
            </A>
            <span>
              {intl.formatMessage(t.reposted)}
            </span>
          </span>
        </div>
      </Show>
      <div class={styles.post}>
        <Show
          when={props.note.replyTo}
          fallback={
            <NoteHeader
              note={props.note}
              openCustomZap={() => {
                setOpenCustomZap(true);
                setTimeout(() => setOpenCustomZap(false), 10);
              }}
            />
          }
        >
          <NoteReplyHeader
            note={props.note}
            openCustomZap={() => {
              setOpenCustomZap(true);
              setTimeout(() => setOpenCustomZap(false), 10);
            }}
          />
        </Show>
        <div class={styles.content}>
          <div class={styles.message}>
            <ParsedNote note={props.note} />
          </div>
          <NoteFooter note={props.note} doCustomZap={openCustomZap()} />
        </div>
      </div>
    </A>
  )
}

export default hookForDev(Note);
