import React, { useEffect, useState } from 'react';
import styles from './Orrery.module.css';
import { PlayOutline, PauseOutline } from '@carbon/icons-react';
import { Slider } from 'carbon-components-react';

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
      'https://api.le-systeme-solaire.net/rest/bodies?filter[]=isPlanet,neq,0'
    );
    const data = await response.json();
    localStorage.setItem('planetsData', JSON.stringify(data.bodies));
    localStorage.setItem('lastFetchTimestamp', currentTime);
    return data.bodies;
  }
};

const Orrery = () => {
  const [planetsData, setPlanetsData] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleSpeedChange = ({ value }) => {
    setAnimationSpeed(value);
  };

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

  const orrerySize = 800;
  const sunSize = 30;
  const minPlanetSize = 20;
  const maxPlanetSize = 40;
  const minOrbitSize = 60;
  const orbitStep = (orrerySize / 2 - minOrbitSize) / planetsData.length;

  const renderPlanet = (planet, index) => {
    const orbitSize = minOrbitSize + index * orbitStep;
    const planetSize =
      ((planet.meanRadius - 2439) / (69841 - 2439)) *
        (maxPlanetSize - minPlanetSize) +
      minPlanetSize;
    const initialRotation = planet.mainAnomaly;
    const animationDuration =
      (planet.sideralOrbit / planetsData[0].sideralOrbit) * 10;

    return (
      <div
        key={planet.id}
        className={styles.orbit}
        style={{
          width: `${orbitSize}px`,
          height: `${orbitSize}px`,
          animationDuration: `${animationDuration / animationSpeed}s`,
          animationDelay: `-${(initialRotation / 360) * animationDuration}s`,
          animationPlayState: `${isPaused ? 'paused' : 'running'}`,
        }}
      >
        <div
          className={styles.planet}
          style={{
            width: `${planetSize}px`,
            height: `${planetSize}px`,
          }}
        ></div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button onClick={handlePlayPause}>
          {isPaused ? <PlayOutline /> : <PauseOutline />}
        </button>
        <Slider
          min={1}
          max={5}
          step={1}
          value={animationSpeed}
          labelText="Animation Speed"
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
