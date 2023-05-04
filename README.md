# OrreryGPT

This project was built with the assistance of ChatGPT4, through much trial and error.

The data comes from [Solar System OpenData](https://api.le-systeme-solaire.net/en/) (view [github](https://github.com/systeme-solaire)).

## Simulation Accuracy

Space is big, so I had to make several tweaks for aesthetic reasons.

- The orbital periods for planets and moons are sped up significantly. At the default speed, Earth will complete a full orbit in 365.256 seconds (1 day == 1 second). The other moons and planets orbit accurately in relation to that scale.
- The sizes of planets are not to scale, but are sized proportionately within a minimum and maximum range
- The orbital distances are evenly spaced for visual reasons. Plans and moons are accuratley ordered by their Semimajor axis, but the actual diameter of the orbit is not to scale.
- Not all moons and bodies are shown. All of the inner moons are shown (Earth's Luna, and Mars' Phobos and Deimos). Of the outer planet moons, only moons with a mean radius of 80km or above are shown.
- The colors are made up.

## Develop

### `npm start`

Runs the app in the development mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run deploy`

Deploy to github pages.
