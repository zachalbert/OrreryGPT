import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import { Play, Pause, LogoGithub } from '@carbon/icons-react';

// Knobs & Levers
const orrerySize = window.innerHeight * 1;
const minPlanetSize = 15;
const moonOrbitStep = 10;
const minMoons = 2;
const minMoonRadius = 80;
const maxMoons = 8;
const animationStepMS = 20;
const stepsPerSecond = 1000 / animationStepMS;
const msPerDay = 86400000;

const fetchData = async () => {
  const cachedData = localStorage.getItem('planetsData');
  const lastFetchTimestamp = localStorage.getItem('lastFetchTimestamp');
  const currentTime = new Date().getTime();

  if (
    cachedData &&
    lastFetchTimestamp &&
    // currentTime - lastFetchTimestamp < 10
    currentTime - lastFetchTimestamp < msPerDay
  ) {
    return JSON.parse(cachedData);
  } else {
    const response = await fetch(
      'https://api.le-systeme-solaire.net/rest/bodies?order=semimajorAxis,asc&filter[]=isPlanet,neq,0;filter[]=isPlanet,neq,-1'
    );
    const data = await response.json();
    const planetData = data.bodies;

    const moonRequests = planetData
      .filter((planet) => planet.moons)
      .map((planet) =>
        fetch(
          `https://api.le-systeme-solaire.net/rest/bodies?order=meanRadius,desc&filter[]=aroundPlanet,eq,${planet.id}`
        )
      );

    const moonResponses = await Promise.all(moonRequests);
    const moonData = await Promise.all(moonResponses.map((res) => res.json()));

    for (let i = 0; i < moonData.length; i++) {
      const planetWithMoons = planetData.find(
        (planet) => planet.id === moonData[i].bodies[0].aroundPlanet.planet
      );

      const filteredMoons = moonData[i].bodies.filter((moon, index) => {
        // Keep the first two moons to save Martian moves from getting filtered out
        if (index < minMoons) {
          return true;
        }
        // Keep remaining moons with meanRadius > minMoonRadius
        return moon.meanRadius > minMoonRadius;
      });

      planetWithMoons.moonsData = filteredMoons;
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
  const [simulationDate, setSimulationDate] = useState(new Date());
  const [daysSinceStart, setDaysSinceStart] = useState(0);
  const [planetRotations, setPlanetRotations] = useState([]);
  const [moonRotations, setMoonRotations] = useState({});

  const orbitStep = orrerySize / (planetsData.length + 3);
  const maxPlanetSize = orbitStep / 2;
  const sunSize = maxPlanetSize * 1.5;
  const moonSize = moonOrbitStep / 2;
  const minOrbitSize = sunSize + orbitStep;

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

  const sunClasses = [
    'absolute',
    'bg-yellow-300',
    'rounded-full',
    'top-1/2',
    'left-1/2',
    '-translate-x-1/2',
    '-translate-y-1/2',
    'shadow-[0_0_200px_0_rgb(255,255,255)]',
    'shadow-amber-200',
  ];

  const orbitClasses = [
    'absolute',
    'left-1/2',
    'top-1/2',
    'border',
    'border-white',
    'border-opacity-10',
    'rounded-full',
    'origin-center',
  ];

  const planetMoonClasses = [
    'absolute',
    'rounded-full',
    'top-0',
    'left-1/2',
    '-translate-x-1/2',
    '-translate-y-1/2',
    'z-40',
  ];

  const handlePlayPause = () => {
    setIsPaused((prevIsPaused) => !prevIsPaused);
  };

  const handleSpeedChange = (event) => {
    setAnimationSpeed(event.target.value);
  };

  useEffect(() => {
    if (!isPaused) {
      const updateRotations = () => {
        const newPlanetRotations = planetsData.map((planet, index) => {
          const initialRotation = planet.mainAnomaly;
          const oneOrbitInSeconds = planet.sideralOrbit / animationSpeed;
          const degreesPerSecond = 360 / oneOrbitInSeconds;
          const degreesPerStep = degreesPerSecond / stepsPerSecond;
          const currentRotation =
            (planetRotations[index] ?? initialRotation) - degreesPerStep;
          return currentRotation % 360;
        });
        setPlanetRotations(newPlanetRotations);

        const newMoonRotations = {};
        planetsData.forEach((planet, planetIndex) => {
          if (planet.moonsData) {
            planet.moonsData.forEach((moon, moonIndex) => {
              let initialRotation = moon.mainAnomaly;
              if (moon.mainAnomaly === 0) {
                initialRotation = (360 / maxMoons) * moonIndex;
              }
              const oneOrbitInSeconds = moon.sideralOrbit / animationSpeed;
              const degreesPerSecond = 360 / oneOrbitInSeconds;
              const degreesPerStep = degreesPerSecond / stepsPerSecond;
              const currentRotation =
                (moonRotations[moon.id]?.[moonIndex] ?? initialRotation) -
                degreesPerStep * (moon.englishName === 'Triton' ? -1 : 1);
              newMoonRotations[moon.id] = newMoonRotations[moon.id] || [];
              newMoonRotations[moon.id][moonIndex] = currentRotation % 360;
            });
          }
        });
        setMoonRotations(newMoonRotations);

        // Calculate days passed based on Earth's rotation
        const earthIndex = planetsData.findIndex(
          (planet) => planet.englishName === 'Earth'
        );
        const earthRotation = planetRotations[earthIndex];
        const daysPassed = Math.floor(
          ((360 - earthRotation) / 360) * planetsData[earthIndex].sideralOrbit
        );

        if (daysPassed > daysSinceStart) {
          setDaysSinceStart(daysPassed);
          const newSimulationDate = new Date(simulationDate);
          newSimulationDate.setDate(simulationDate.getDate() + 1);
          setSimulationDate(newSimulationDate);
        }
      };

      const intervalId = setInterval(updateRotations, animationStepMS);

      return () => clearInterval(intervalId);
    }
  }, [isPaused, planetsData, planetRotations, moonRotations, animationSpeed]);

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

  const renderPlanet = (planet, index) => {
    const orbitSize = minOrbitSize + index * orbitStep;
    const planetSize =
      ((planet.meanRadius - 2439) / (69841 - 2439)) *
        (maxPlanetSize - minPlanetSize) +
      minPlanetSize;
    const initialRotation = planet.mainAnomaly;

    const moons = planet.moonsData
      ? planet.moonsData.sort((a, b) => a.semimajorAxis - b.semimajorAxis)
      : [];

    return (
      <div
        key={planet.id}
        className={cx(orbitClasses)}
        id={planet.englishName + '_orbit'}
        style={{
          width: `${orbitSize}px`,
          height: `${orbitSize}px`,
          transform: `translate(-50%, -50%) rotate(${
            (planetRotations[index] ?? initialRotation) % 360
          }deg)`,
        }}
      >
        <div
          className={cx(planetMoonClasses, planetColor[index])}
          id={planet.englishName}
          style={{
            width: `${planetSize}px`,
            height: `${planetSize}px`,
          }}
        >
          {moons.map((moon, idx) =>
            renderMoon(moon, idx, planetSize, planetColor[index])
          )}
        </div>
      </div>
    );
  };

  const renderMoon = (moon, index, planetSize, bg) => {
    const moonOrbitSize = planetSize + moonOrbitStep + index * moonOrbitStep;

    return (
      <div
        key={moon.id}
        className={cx(orbitClasses, 'border-none')}
        id={moon.englishName + '_orbit'}
        style={{
          width: `${moonOrbitSize}px`,
          height: `${moonOrbitSize}px`,
          transform: `translate(-50%, -50%) rotate(${
            (moonRotations[moon.id] && moonRotations[moon.id][index]) || 0
          }deg)`,
        }}
      >
        <div
          className={cx(planetMoonClasses, bg)}
          id={moon.englishName}
          style={{
            width: `${moonSize}px`,
            height: `${moonSize}px`,
          }}
        ></div>
      </div>
    );
  };

  return (
    <div className="flex h-full relative items-center justify-center">
      <div className="text-slate-400 absolute top-6 mx-auto font-bold">
        {simulationDate.toLocaleDateString('en-us', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
      <div className="absolute top-4 right-6 flex items-center space-x-4 z-50">
        <input
          className="bg-slate-200 accent-blue-500 hover:accent-blue-400 active:accent-blue-600 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          type="range"
          min={0.1}
          max={20}
          step={0.1}
          value={animationSpeed.toString()}
          onChange={handleSpeedChange}
        />
        <button
          onClick={handlePlayPause}
          className="text-slate-500 hover:text-slate-400 active:text-slate-300 p-2 hover:bg-slate-900 active:bg-slate-800 rounded-full"
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
          className="relative mx-auto"
          style={{ width: `${orrerySize}px`, height: `${orrerySize}px` }}
        >
          <div
            className={cx(sunClasses)}
            style={{ width: `${sunSize}px`, height: `${sunSize}px` }}
          ></div>
          {planetsData.map(renderPlanet)}
        </div>
      )}
      <div className="text-slate-500 text-xs md:text-base absolute bottom-4 mx-auto flex space-x-1 items-center">
        <span>ChatGPT-assisted solar system.</span>
        <a
          href="https://github.com/zachalbert/OrreryGPT"
          rel="noreferrer"
          target="_blank"
          className="flex items-center space-x-1 ml-2"
        >
          <LogoGithub className="inline" />
          <span>Source &amp; info</span>
        </a>
        .
      </div>
    </div>
  );
};

export default Orrery;
