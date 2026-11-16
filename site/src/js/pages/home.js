import { boot } from '../core.js';
import { initHero } from '../home/hero.js';
import { initConfig } from '../home/config.js';
import { initStory } from '../home/story.js';
import { initDepts } from '../home/depts.js';
import { initNight, initChat } from '../home/night.js';
import { initSections } from '../home/sections.js';

boot(() => {
  initHero();
  initConfig();
  initStory();
  initDepts();
  initNight();
  initChat();
  initSections();
});
