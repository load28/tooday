import { globalLayer, type StyleRule } from '@vanilla-extract/css';

export const resetLayer = globalLayer('reset');
export const baseLayer = globalLayer('base');
export const tokensLayer = globalLayer('tokens');
export const recipesLayer = globalLayer('recipes');
export const utilitiesLayer = globalLayer('utilities');

export const rec = (rule: StyleRule): StyleRule => ({ '@layer': { [recipesLayer]: rule } });
export const util = (rule: StyleRule): StyleRule => ({ '@layer': { [utilitiesLayer]: rule } });
