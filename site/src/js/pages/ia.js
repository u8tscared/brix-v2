import { boot } from '../core.js';
import { heroIn, faq } from '../subpage.js';
import { heroBob, bobGrid, nightSky, bobSwitch } from '../ia/bob.js';
import { initDictation } from '../ia/dictation.js';
import { initCall } from '../ia/call.js';
import { initMcp } from '../ia/mcp.js';

boot(() => {
  heroBob(heroIn());
  bobGrid();
  initDictation();
  nightSky();
  initCall();
  initMcp();
  bobSwitch();
  faq(document.querySelector('[data-faq]'));
});
