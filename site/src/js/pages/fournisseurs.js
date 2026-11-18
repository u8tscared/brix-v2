import { boot } from '../core.js';
import { faq } from '../subpage.js';
import { heroIntro, heroRfq, flow, order, catalog, portal, codeTabs, more } from '../fournisseurs/sections.js';
import { initCompare } from '../fournisseurs/compare.js';

boot(() => {
  heroRfq(heroIntro());
  flow();
  initCompare();
  order();
  catalog();
  portal();
  codeTabs();
  more();
  faq(document.querySelector('[data-faq]'));
});
