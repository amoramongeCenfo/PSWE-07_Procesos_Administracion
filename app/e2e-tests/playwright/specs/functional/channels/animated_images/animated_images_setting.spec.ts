// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Locator} from '@playwright/test';

import {expect, test} from '@mattermost/playwright-lib';

// Issue #26 (C9 of mattermost/mattermost#17740): "Animated images (GIFs)" display setting, end to end.
// Asset: 240x160 animated GIF (10 frames), wide enough to show the play/pause button (>= 100px).
const GIF_FILE = 'animated-240x160.gif';
const STILL_FRAME_NAME = /Animation paused, select to play/;

// The play/pause button sits centered over the image (#42), so a plain click() on the image would land on it.
// The top-left corner is not free either: on hover, Mattermost shows the collapse-image button there.
// The image itself is selected near its bottom-left corner.
async function selectImage(image: Locator) {
    const box = await image.boundingBox();
    if (!box) {
        throw new Error('Image is not visible');
    }
    await image.click({position: {x: 10, y: box.height - 10}});
}

/**
 * @objective Verify that turning off "Animated images (GIFs)" shows posted GIFs as a still frame that the user can play and pause
 */
test(
    'C9 turns off animated images, sees a still GIF, plays and pauses it, and the choice persists',
    {tag: ['@animated_images', '@display_settings', '@file_attachments']},
    async ({pw}) => {
        // # Create and log in as a test user
        const {user, team} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'off-topic');
        await channelsPage.toBeVisible();

        // # Post a message with an animated GIF attachment
        await channelsPage.postMessage(`Animated GIF ${pw.random.id()}`, [GIF_FILE]);
        let post = await channelsPage.getLastPost();
        const gif = post.container.getByRole('img', {name: /file thumbnail/i});

        // * By default (setting on) the GIF animates as before: no still frame, no play button
        await expect(gif).toBeVisible();
        await expect(post.container.getByRole('img', {name: STILL_FRAME_NAME})).toHaveCount(0);
        await expect(post.container.getByRole('button', {name: 'Play animation'})).toHaveCount(0);

        // # Settings > Display > Animated images (GIFs) > Off > Save
        const settingsModal = await channelsPage.openSettings();
        const displaySettings = await settingsModal.openDisplayTab();
        await displaySettings.setAnimatedImages('Off');
        await settingsModal.close();

        // * The GIF now shows a still frame with a play button
        post = await channelsPage.getLastPost();
        const stillFrame = post.container.getByRole('img', {name: STILL_FRAME_NAME});
        await expect(stillFrame).toBeVisible();
        await expect(post.container.getByRole('button', {name: 'Play animation'})).toBeVisible();

        // # Select the still frame
        await selectImage(stillFrame);

        // * The GIF plays, a pause button appears and the preview modal does not open
        await expect(stillFrame).toHaveCount(0);
        await expect(gif).toBeVisible();
        await expect(post.container.getByRole('button', {name: 'Pause animation'})).toBeVisible();
        await expect(page.locator('.file-preview-modal')).toHaveCount(0);

        // # Pause it again
        await post.container.getByRole('button', {name: 'Pause animation'}).click();

        // * Back to the still frame
        await expect(post.container.getByRole('img', {name: STILL_FRAME_NAME})).toBeVisible();

        // # Reload the page
        await page.reload();
        await channelsPage.toBeVisible();

        // * The preference was saved on the server: the GIF is still shown as a still frame
        post = await channelsPage.getLastPost();
        await expect(post.container.getByRole('img', {name: STILL_FRAME_NAME})).toBeVisible();
    },
);

/**
 * @objective Verify that with animated images off, a GIF that is playing still opens the preview when selected, and the preview opens it paused
 */
test(
    'C9 selecting a GIF that is already playing opens the preview as usual, and C8 the preview opens it paused',
    {tag: ['@animated_images', '@display_settings', '@file_attachments']},
    async ({pw}) => {
        // # Create a test user with "Animated images (GIFs)" already off
        const {user, team, userClient} = await pw.initSetup();
        await userClient.savePreferences(user.id, [
            {user_id: user.id, category: 'display_settings', name: 'allow_animated_images', value: 'false'},
        ]);

        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'off-topic');
        await channelsPage.toBeVisible();

        // # Post a GIF, then play it
        await channelsPage.postMessage(`Animated GIF ${pw.random.id()}`, [GIF_FILE]);
        const post = await channelsPage.getLastPost();
        await selectImage(post.container.getByRole('img', {name: STILL_FRAME_NAME}));
        await expect(post.container.getByRole('button', {name: 'Pause animation'})).toBeVisible();

        // # Select the playing GIF
        await selectImage(post.container.getByRole('img', {name: /file thumbnail/i}));

        // * The preview modal opens
        const previewModal = page.getByRole('dialog', {name: GIF_FILE});
        await expect(previewModal).toBeVisible();

        // * C8: with animated images off, the enlarged view opens the GIF paused (still frame + play button)
        await expect(previewModal.getByRole('img', {name: STILL_FRAME_NAME})).toBeVisible();
        await expect(previewModal.getByRole('button', {name: 'Play animation'})).toBeVisible();

        // # Play it from the enlarged view
        await previewModal.getByRole('button', {name: 'Play animation'}).click();

        // * The GIF plays in the enlarged view and offers to pause it
        await expect(previewModal.getByRole('img', {name: STILL_FRAME_NAME})).toHaveCount(0);
        await expect(previewModal.getByRole('button', {name: 'Pause animation'})).toBeVisible();
    },
);

/**
 * @objective Verify the still frame and its controls on a phone-sized screen
 */
test(
    'C9 on a phone-sized screen the still GIF and its play button are shown and selecting it plays the GIF',
    {tag: ['@animated_images', '@display_settings', '@mobile_view']},
    async ({pw}) => {
        // # Create a test user with "Animated images (GIFs)" already off
        const {user, team, userClient} = await pw.initSetup();
        await userClient.savePreferences(user.id, [
            {user_id: user.id, category: 'display_settings', name: 'allow_animated_images', value: 'false'},
        ]);

        // # Log in on a phone-sized viewport
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await page.setViewportSize({width: 390, height: 844});
        await channelsPage.goto(team.name, 'off-topic');
        await channelsPage.toBeVisible();

        // # Post a GIF
        await channelsPage.postMessage(`Animated GIF ${pw.random.id()}`, [GIF_FILE]);
        const post = await channelsPage.getLastPost();

        // * Still frame and play button are visible inside the viewport
        const stillFrame = post.container.getByRole('img', {name: STILL_FRAME_NAME});
        await expect(stillFrame).toBeInViewport();
        await expect(post.container.getByRole('button', {name: 'Play animation'})).toBeInViewport();

        // # Select the still frame
        await selectImage(stillFrame);

        // * The GIF plays and the pause button is shown
        await expect(stillFrame).toHaveCount(0);
        await expect(post.container.getByRole('button', {name: 'Pause animation'})).toBeVisible();
    },
);
