import React, { useEffect, useState } from 'react';
import styles from './Orrery.module.css';
import cx from 'classnames';
import { Play, Pause, LogoGithub } from '@carbon/icons-react';

const fetchData = async () => {
  const cachedData = localStorage.getItem('planetsData');
  const lastFetchTimestamp = localStorage.getItem('lastFetchTimestamp');
  const currentTime = new Date().getTime();

  if (
    cachedData &&
    lastFetchTimestamp &&
    currentTime - lastFetchTimestamp < 86400000
  ) {
    return JSON.parse(cachedData);
  } else {
    const response = await fetch(
      'https://api.le-systeme-solaire.net/rest/bodies?filter[]=isPlanet,neq,0;filter[]=isPlanet,neq,-1'
    );
    const data = await response.json();
    const planetData = data.bodies;

    for (const planet of planetData) {
      if (planet.moons) {
        const moonResponse = await fetch(
          `https://api.le-systeme-solaire.net/rest/bodies?filter[]=aroundPlanet,eq,${planet.id}`
        );
        const moonData = await moonResponse.json();
        planet.moonsData = moonData.bodies;
      }
    }

    localStorage.setItem('planetsData', JSON.stringify(planetData));
    localStorage.setItem('lastFetchTimestamp', currentTime);
    return planetData;
  }
};

const Orrery = () => {
  const defaultAnimationSpeed = 1;
  const [isLoading, setIsLoading] = useState(true);
  const [planetsData, setPlanetsData] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(defaultAnimationSpeed);

  const planetColor = [
    'bg-yellow-400',
    'bg-lime-400',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-sky-700',
    'bg-blue-700',
  ];

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleSpeedChange = (event) => {
    setAnimationSpeed(event.target.value);
  };

  const orrerySize = window.innerHeight * 0.9;
  const minPlanetSize = 15;
  const maxMoons = 8;

  const moonOrbitStep = 15;
  const moonSpeedFactor = 1;

  const orbitStep = orrerySize / (planetsData.length + 3);
  const maxPlanetSize = orbitStep / 2;
  const sunSize = maxPlanetSize * 1.5;
  const moonSize = moonOrbitStep / 2;
  const minOrbitSize = sunSize + orbitStep;

  useEffect(() => {
    const fetchPlanets = async () => {
      try {
        setIsLoading(true);
        const data = await fetchData();
        const sortedData = data.sort(
          (a, b) => a.semimajorAxis - b.semimajorAxis
        );
        setPlanetsData(sortedData);
        setIsLoading(false);
      } catch (err) {
        console.error('error fetching planets data:', err);
      }
    };

    fetchPlanets();
  }, []);

  const renderMoon = (moon, index, planetSize, planetAnimationDuration, bg) => {
    const moonOrbitSize = planetSize + moonOrbitStep + index * moonOrbitStep;
    const animationDuration = moon.sideralOrbit * moonSpeedFactor;
    let initialRotation = moon.mainAnomaly;
    if (moon.mainAnomaly === 0) {
      initialRotation = (360 / maxMoons) * index;
    }

    return (
      <div
        key={moon.id}
        title={moon.englishName}
        className={cx(styles.moonOrbit, moon.englishName)}
        style={{
          width: `${moonOrbitSize}px`,
          height: `${moonOrbitSize}px`,
          animationDuration: `${animationDuration / animationSpeed}s`,
          animationDelay: `-${
            (initialRotation / 360) * (animationDuration / animationSpeed)
          }s`,
          animationPlayState: `${isPaused ? 'paused' : 'running'}`,
          animationName:
            moon.englishName === 'Triton' ? styles.orbitCW : styles.orbitCCW,
        }}
      >
        <div
          className={cx(styles.moon, bg)}
          title={moon.englishName}
          style={{
            width: `${moonSize}px`,
            height: `${moonSize}px`,
          }}
        ></div>
      </div>
    );
  };

  const renderPlanet = (planet, index) => {
    const orbitSize = minOrbitSize + index * orbitStep;
    const planetSize =
      ((planet.meanRadius - 2439) / (69841 - 2439)) *
        (maxPlanetSize - minPlanetSize) +
      minPlanetSize;
    const initialRotation = planet.mainAnomaly;
    const animationDuration = planet.sideralOrbit / animationSpeed;

    const moons = planet.moonsData
      ? planet.moonsData
          .slice(0, maxMoons)
          .sort((a, b) => a.semimajorAxis - b.semimajorAxis)
      : [];

    return (
      <div
        key={planet.id}
        className={styles.orbit}
        title={planet.englishName}
        style={{
          width: `${orbitSize}px`,
          height: `${orbitSize}px`,
          animationDuration: `${animationDuration}s`,
          animationDelay: `-${(initialRotation / 360) * animationDuration}s`,
          animationPlayState: `${isPaused ? 'paused' : 'running'}`,
        }}
      >
        <div
          className={cx(styles.planet, planetColor[index])}
          title={planet.englishName}
          style={{
            width: `${planetSize}px`,
            height: `${planetSize}px`,
          }}
        >
          {moons.map((moon, idx) =>
            renderMoon(
              moon,
              idx,
              planetSize,
              animationDuration,
              planetColor[index]
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full relative items-center justify-center">
      <div className="absolute top-4 right-6 flex items-center space-x-4 z-50">
        <input
          className="bg-slate-200 accent-blue-500 hover:accent-blue-400 active:accent-blue-600 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={animationSpeed.toString()}
          onChange={handleSpeedChange}
        />
        <button
          onClick={handlePlayPause}
          className="text-slate-500 hover:text-slate-400 active:text-slate-300 p-4 hover:bg-slate-900 active:bg-slate-800 rounded-full"
        >
          {isPaused ? (
            <Play className="w-6 h-6" />
          ) : (
            <Pause className="w-6 h-6" />
          )}
        </button>
      </div>
      {isLoading ? (
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 bg-slate-500 rounded-full"></div>
          <div className="absolute w-24 h-4 flex justify-between animate-[spin_2s_linear_infinite]">
            <div className="w-4 h-4 bg-slate-600 rounded-full"></div>
          </div>
          <div className="absolute w-32 h-4 flex justify-between animate-[spin_4s_linear_infinite]">
            <div className="w-3 h-3 bg-slate-700 rounded-full"></div>
          </div>
        </div>
      ) : (
        <div
          className={styles.orrery}
          style={{ width: `${orrerySize}px`, height: `${orrerySize}px` }}
        >
          <div
            className={styles.sun}
            style={{ width: `${sunSize}px`, height: `${sunSize}px` }}
          ></div>
          {planetsData.map(renderPlanet)}
        </div>
      )}
      <div className="text-slate-500 text-xs md:text-base absolute bottom-4 mx-auto flex space-x-1 items-center">
        <span>ChatGPT-assisted solar system by</span>
        <a href="https://www.zachalbert.com/" target="_blank" rel="noreferrer">
          Zac
        </a>
        <span>.</span>
        <a
          href="https://github.com/zachalbert/OrreryGPT"
          rel="noreferrer"
          target="_blank"
          className="flex items-center space-x-1 ml-2"
        >
          <LogoGithub className="inline" />
          <span>Source</span>
        </a>
        .
      </div>
    </div>
  );
};

export default Orrery;
