import { boot } from '../core.js';
import { heroIn, faq } from '../subpage.js';
import { heroRfq, flow, order, catalog, portal, codeTabs, more } from '../fournisseurs/sections.js';
import { initCompare } from '../fournisseurs/compare.js';

boot(() => {
  heroRfq(heroIn());
  flow();
  initCompare();
  order();
  catalog();
  portal();
  codeTabs();
  more();
  faq(document.querySelector('[data-faq]'));
});
