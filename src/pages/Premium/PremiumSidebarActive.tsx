import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSidebarActive: Component<{
  onSidebarAction: (action: string) => void,
  onOpenFAQ?: () => void,
}> = (props) => {

  return (

    <div class={styles.premiumSidebar}>
      <div class={styles.premiumSidebarTitle}>
        Primal Account
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('orderHistory')}>Order history</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('changeName')}>Change your Primal name</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('extendSubscription')}>Extend your subscripton</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('buyMoreNames')}>Buy aditional Primal name(s)</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('giftPremium')}>Gift Primal premium</ButtonLink>
          </li>
        </ul>
      </div>

      <div class={styles.premiumSidebarTitle}>
        Nostr Tools
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('giftPremium')}>Gift Primal premium</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('changeName')}>Change your Primal name</ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('buyMoreNames')}>Buy aditional Primal name(s)</ButtonLink>
          </li>
        </ul>
      </div>

      <div class={styles.premiumSidebarDescription}>
        Have a question?&nbsp;
        <ButtonLink onClick={props.onOpenFAQ}>Check out our FAQ.</ButtonLink>
      </div>
    </div>
  );
}

export default PremiumSidebarActive;
