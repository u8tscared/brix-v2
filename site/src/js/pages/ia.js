import { boot } from '../core.js';
import { faq } from '../subpage.js';
import { heroIntro, heroBob, toc, bobGrid, nightRun, bobSwitch, copyDemo } from '../ia/bob.js';
import { initDictation } from '../ia/dictation.js';
import { initCall } from '../ia/call.js';
import { initMcp } from '../ia/mcp.js';

boot(() => {
  heroBob(heroIntro());
  toc();
  bobGrid();
  initDictation();
  nightRun();
  initCall();
  initMcp();
  copyDemo();
  bobSwitch();
  faq(document.querySelector('[data-faq]'));
});
