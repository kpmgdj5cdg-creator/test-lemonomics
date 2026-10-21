import {expect} from '@playwright/test';
export async function enterGame(game){
 await expect(game.locator('#profileScreen')).toBeVisible();
 const load=game.locator('[data-load-slot]').first();
 if(await load.count())await load.click();
 else{
  await game.locator('[data-new-slot="0"]').click();await game.locator('#profileName').fill('Test');await game.locator('[data-submit-name]').click();await game.locator('[data-avatar=male]').click();await game.locator('#welcomeBack').click();
 }
 await expect(game.locator('#ll-app')).toBeVisible();
}
