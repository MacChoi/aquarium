import { Fish, Vector2D, FISH_TYPES } from '../common/fish.js';

(function() {
    const fish1Container = document.querySelector('.container');
    const fish1Width = fish1Container.offsetWidth;
    const fish1Height = fish1Container.offsetHeight;

    const fish1 = new Fish(
        new Vector2D(fish1Width/2, fish1Height/2),
        FISH_TYPES.SHARK,
         'fish_10/10.png',
         250,250

    );

    function animateFish1() {
        const deltaTime = 1 / 60;
        fish1.update(deltaTime, [], [], [], [0, fish1Width, 0, fish1Height], []);
        requestAnimationFrame(animateFish1);
    }

    animateFish1();
})(); 