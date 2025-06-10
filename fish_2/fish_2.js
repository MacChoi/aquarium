import { Fish, Vector2D, FISH_TYPES } from '../common/fish.js';

(function() {
    const fish2Container = document.querySelector('.container');
    const fish2Width = fish2Container.offsetWidth;
    const fish2Height = fish2Container.offsetHeight;

    const fish2 = new Fish(
        new Vector2D(fish2Width/2, fish2Height/2),
        FISH_TYPES.GUPPY,
       'fish_2/2.png',
       100,100
    );

    function animateFish2() {
        const deltaTime = 1 / 60;
        fish2.update(deltaTime, [], [], [], [0, fish2Width, 0, fish2Height], []);
        requestAnimationFrame(animateFish2);
    }

    animateFish2();
})(); 