import React, { useEffect, useState } from 'react';
import styles from './Orrery.module.css';
import cx from 'classnames';
import { PlayOutline, PauseOutline } from '@carbon/icons-react';

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
  const [planetsData, setPlanetsData] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(defaultAnimationSpeed);
  const [prevAnimationSpeed, setPrevAnimationSpeed] = useState(
    defaultAnimationSpeed
  );
  const [simStarted, setSimStarted] = useState(new Date().getTime());

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleSpeedChange = event => {
    setPrevAnimationSpeed(animationSpeed);
    setAnimationSpeed(event.target.value);
  };

  const orrerySize = 800;
  const minPlanetSize = 20;

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
        const data = await fetchData();
        const sortedData = data.sort(
          (a, b) => a.semimajorAxis - b.semimajorAxis
        );
        setPlanetsData(sortedData);
      } catch (err) {
        console.error('error fetching planets data:', err);
      }
    };

    fetchPlanets();
  }, []);

  const renderMoon = (moon, index, planetSize, planetAnimationDuration) => {
    const moonOrbitSize = planetSize + moonOrbitStep + index * moonOrbitStep;
    const initialRotation = moon.mainAnomaly;
    const animationDuration = moon.sideralOrbit * moonSpeedFactor;

    return (
      <div
        key={moon.id}
        title={moon.englishName}
        className={cx(
          styles.moonOrbit,
          styles.moon.englishName && styles.moon.englishName
        )}
        style={{
          width: `${moonOrbitSize}px`,
          height: `${moonOrbitSize}px`,
          animationDuration: `${animationDuration / animationSpeed}s`,
          animationDelay: `-${(initialRotation / 360) *
            (animationDuration / animationSpeed)}s`,
          animationPlayState: `${isPaused ? 'paused' : 'running'}`,
        }}
      >
        <div
          className={styles.moon}
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
    const elapsedTime = (new Date().getTime() - simStarted) / 1000; // seconds since speed change

    // Calculate the current rotation percentage
    const previousAnimationDuration = planet.sideralOrbit / prevAnimationSpeed;
    const currentRotationPercentage =
      ((elapsedTime % previousAnimationDuration) / previousAnimationDuration) *
      360;
    // if (planet.id === 'mercure') {
    //   console.log(currentRotationPercentage);
    // }

    const moons = planet.moonsData
      ? planet.moonsData
          .slice(0, 5)
          .sort((a, b) => a.semimajorAxis - b.semimajorAxis)
      : [];

    return (
      <div
        key={planet.id}
        title={planet.englishName}
        className={styles.orbit}
        style={{
          width: `${orbitSize}px`,
          height: `${orbitSize}px`,
          animationDuration: `${animationDuration}s`,
          animationDelay: `-${(initialRotation / 360) * animationDuration}s`,
          // animationDelay: `-${(initialRotation / 360 +
          //   currentRotationPercentage) %
          //   100}%`,
          animationPlayState: `${isPaused ? 'paused' : 'running'}`,
        }}
      >
        <div
          className={styles.planet}
          title={planet.englishName}
          style={{
            width: `${planetSize}px`,
            height: `${planetSize}px`,
          }}
        >
          {moons.map((moon, idx) =>
            renderMoon(moon, idx, planetSize, animationDuration)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button onClick={handlePlayPause}>
          {isPaused ? <PlayOutline /> : <PauseOutline />}
        </button>
        <input
          type="number"
          min={1}
          max={10}
          step={1}
          value={animationSpeed.toString()}
          onChange={handleSpeedChange}
        />
      </div>
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
    </div>
  );
};

export default Orrery;
