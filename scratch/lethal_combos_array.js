const LETHAL_COMBOS = [
  {
    "text": "contact over 91 & speed over 86 (elite speedster)",
    "query": "hitters with contact over 91 and speed over 86"
  },
  {
    "text": "sinker speed over 95 mph (hard velocity)",
    "query": "pitchers with Sinker speed over 95 mph"
  },
  {
    "text": "power over 92 & speed over 82 (power-speed threat)",
    "query": "hitters with power over 92 and speed over 82"
  },
  {
    "text": "cutter break over 90 (heavy movement)",
    "query": "pitchers with Cutter break over 90"
  },
  {
    "text": "contact over 98 & power over 88 (ultimate bat)",
    "query": "hitters with contact over 98 and power over 88"
  },
  {
    "text": "slider control over 88 (precise locator)",
    "query": "pitchers with Slider control over 88"
  },
  {
    "text": "vision over 96 & clutch over 94 (clutch contact)",
    "query": "hitters with vision over 96 and clutch over 94"
  },
  {
    "text": "k/9 over 89 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 89 and stamina over 79"
  },
  {
    "text": "fielding over 95 & speed over 90 (elite defense)",
    "query": "hitters with fielding over 95 and speed over 90"
  },
  {
    "text": "h/9 over 90 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 90 and bb/9 over 85"
  },
  {
    "text": "diamond hitters from Yankees (power over 91)",
    "query": "diamond hitters from Yankees with power over 91"
  },
  {
    "text": "12-6 curve speed over 95 & slider break over 91",
    "query": "pitchers with 12-6 Curve speed over 95 mph and slider break over 91"
  },
  {
    "text": "gold hitters from Dodgers (speed over 92)",
    "query": "gold hitters from Dodgers with speed over 92"
  },
  {
    "text": "circle change control over 92 & break over 92",
    "query": "pitchers with Circle Change control over 92 and break over 92"
  },
  {
    "text": "contact over 92 & speed over 93 (elite speedster)",
    "query": "hitters with contact over 92 and speed over 93"
  },
  {
    "text": "pitchers from Red Sox (h/9 over 88)",
    "query": "pitchers from Red Sox with h/9 over 88"
  },
  {
    "text": "power over 93 & speed over 89 (power-speed threat)",
    "query": "hitters with power over 93 and speed over 89"
  },
  {
    "text": "sweeper speed over 97 mph (hard velocity)",
    "query": "pitchers with Sweeper speed over 97 mph"
  },
  {
    "text": "contact over 97 & power over 87 (ultimate bat)",
    "query": "hitters with contact over 97 and power over 87"
  },
  {
    "text": "knuckle-curve break over 90 (heavy movement)",
    "query": "pitchers with Knuckle-curve break over 90"
  },
  {
    "text": "vision over 97 & clutch over 93 (clutch contact)",
    "query": "hitters with vision over 97 and clutch over 93"
  },
  {
    "text": "sweeping curve control over 85 (precise locator)",
    "query": "pitchers with Sweeping Curve control over 85"
  },
  {
    "text": "fielding over 90 & speed over 86 (elite defense)",
    "query": "hitters with fielding over 90 and speed over 86"
  },
  {
    "text": "k/9 over 86 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 86 and stamina over 87"
  },
  {
    "text": "diamond hitters from Cubs (power over 87)",
    "query": "diamond hitters from Cubs with power over 87"
  },
  {
    "text": "h/9 over 87 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 87 and bb/9 over 93"
  },
  {
    "text": "gold hitters from Mets (speed over 88)",
    "query": "gold hitters from Mets with speed over 88"
  },
  {
    "text": "splitter speed over 98 & slider break over 89",
    "query": "pitchers with Splitter speed over 98 mph and slider break over 89"
  },
  {
    "text": "contact over 93 & speed over 89 (elite speedster)",
    "query": "hitters with contact over 93 and speed over 89"
  },
  {
    "text": "changeup control over 90 & break over 90",
    "query": "pitchers with Changeup control over 90 and break over 90"
  },
  {
    "text": "power over 94 & speed over 85 (power-speed threat)",
    "query": "hitters with power over 94 and speed over 85"
  },
  {
    "text": "pitchers from Braves (h/9 over 80)",
    "query": "pitchers from Braves with h/9 over 80"
  },
  {
    "text": "contact over 96 & power over 86 (ultimate bat)",
    "query": "hitters with contact over 96 and power over 86"
  },
  {
    "text": "curveball speed over 99 mph (hard velocity)",
    "query": "pitchers with Curveball speed over 99 mph"
  },
  {
    "text": "vision over 92 & clutch over 92 (clutch contact)",
    "query": "hitters with vision over 92 and clutch over 92"
  },
  {
    "text": "forkball break over 90 (heavy movement)",
    "query": "pitchers with Forkball break over 90"
  },
  {
    "text": "fielding over 91 & speed over 93 (elite defense)",
    "query": "hitters with fielding over 91 and speed over 93"
  },
  {
    "text": "screwball control over 93 (precise locator)",
    "query": "pitchers with Screwball control over 93"
  },
  {
    "text": "diamond hitters from Giants (power over 94)",
    "query": "diamond hitters from Giants with power over 94"
  },
  {
    "text": "k/9 over 94 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 94 and stamina over 79"
  },
  {
    "text": "gold hitters from Phillies (speed over 95)",
    "query": "gold hitters from Phillies with speed over 95"
  },
  {
    "text": "h/9 over 95 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 95 and bb/9 over 85"
  },
  {
    "text": "contact over 94 & speed over 85 (elite speedster)",
    "query": "hitters with contact over 94 and speed over 85"
  },
  {
    "text": "sinker speed over 96 & slider break over 87",
    "query": "pitchers with Sinker speed over 96 mph and slider break over 87"
  },
  {
    "text": "power over 95 & speed over 81 (power-speed threat)",
    "query": "hitters with power over 95 and speed over 81"
  },
  {
    "text": "cutter control over 88 & break over 88",
    "query": "pitchers with Cutter control over 88 and break over 88"
  },
  {
    "text": "contact over 95 & power over 85 (ultimate bat)",
    "query": "hitters with contact over 95 and power over 85"
  },
  {
    "text": "pitchers from Padres (h/9 over 88)",
    "query": "pitchers from Padres with h/9 over 88"
  },
  {
    "text": "vision over 93 & clutch over 91 (clutch contact)",
    "query": "hitters with vision over 93 and clutch over 91"
  },
  {
    "text": "slider speed over 95 mph (hard velocity)",
    "query": "pitchers with Slider speed over 95 mph"
  },
  {
    "text": "fielding over 92 & speed over 89 (elite defense)",
    "query": "hitters with fielding over 92 and speed over 89"
  },
  {
    "text": "12-6 curve break over 90 (heavy movement)",
    "query": "pitchers with 12-6 Curve break over 90"
  },
  {
    "text": "diamond hitters from Mariners (power over 90)",
    "query": "diamond hitters from Mariners with power over 90"
  },
  {
    "text": "circle change control over 90 (precise locator)",
    "query": "pitchers with Circle Change control over 90"
  },
  {
    "text": "gold hitters from Orioles (speed over 91)",
    "query": "gold hitters from Orioles with speed over 91"
  },
  {
    "text": "k/9 over 91 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 91 and stamina over 87"
  },
  {
    "text": "contact over 95 & speed over 92 (elite speedster)",
    "query": "hitters with contact over 95 and speed over 92"
  },
  {
    "text": "h/9 over 92 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 92 and bb/9 over 93"
  },
  {
    "text": "power over 90 & speed over 88 (power-speed threat)",
    "query": "hitters with power over 90 and speed over 88"
  },
  {
    "text": "sweeper speed over 94 & slider break over 85",
    "query": "pitchers with Sweeper speed over 94 mph and slider break over 85"
  },
  {
    "text": "contact over 98 & power over 92 (ultimate bat)",
    "query": "hitters with contact over 98 and power over 92"
  },
  {
    "text": "knuckle-curve control over 86 & break over 86",
    "query": "pitchers with Knuckle-curve control over 86 and break over 86"
  },
  {
    "text": "vision over 94 & clutch over 90 (clutch contact)",
    "query": "hitters with vision over 94 and clutch over 90"
  },
  {
    "text": "pitchers from Astros (h/9 over 80)",
    "query": "pitchers from Astros with h/9 over 80"
  },
  {
    "text": "fielding over 93 & speed over 85 (elite defense)",
    "query": "hitters with fielding over 93 and speed over 85"
  },
  {
    "text": "sweeping curve speed over 97 mph (hard velocity)",
    "query": "pitchers with Sweeping Curve speed over 97 mph"
  },
  {
    "text": "diamond hitters from Yankees (power over 86)",
    "query": "diamond hitters from Yankees with power over 86"
  },
  {
    "text": "splitter break over 90 (heavy movement)",
    "query": "pitchers with Splitter break over 90"
  },
  {
    "text": "gold hitters from Dodgers (speed over 87)",
    "query": "gold hitters from Dodgers with speed over 87"
  },
  {
    "text": "changeup control over 87 (precise locator)",
    "query": "pitchers with Changeup control over 87"
  },
  {
    "text": "contact over 90 & speed over 88 (elite speedster)",
    "query": "hitters with contact over 90 and speed over 88"
  },
  {
    "text": "k/9 over 88 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 88 and stamina over 79"
  },
  {
    "text": "power over 91 & speed over 84 (power-speed threat)",
    "query": "hitters with power over 91 and speed over 84"
  },
  {
    "text": "h/9 over 89 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 89 and bb/9 over 85"
  },
  {
    "text": "contact over 97 & power over 91 (ultimate bat)",
    "query": "hitters with contact over 97 and power over 91"
  },
  {
    "text": "curveball speed over 97 & slider break over 93",
    "query": "pitchers with Curveball speed over 97 mph and slider break over 93"
  },
  {
    "text": "vision over 95 & clutch over 97 (clutch contact)",
    "query": "hitters with vision over 95 and clutch over 97"
  },
  {
    "text": "forkball control over 94 & break over 94",
    "query": "pitchers with Forkball control over 94 and break over 94"
  },
  {
    "text": "fielding over 94 & speed over 92 (elite defense)",
    "query": "hitters with fielding over 94 and speed over 92"
  },
  {
    "text": "pitchers from Red Sox (h/9 over 88)",
    "query": "pitchers from Red Sox with h/9 over 88"
  },
  {
    "text": "diamond hitters from Cubs (power over 93)",
    "query": "diamond hitters from Cubs with power over 93"
  },
  {
    "text": "screwball speed over 99 mph (hard velocity)",
    "query": "pitchers with Screwball speed over 99 mph"
  },
  {
    "text": "gold hitters from Mets (speed over 94)",
    "query": "gold hitters from Mets with speed over 94"
  },
  {
    "text": "sinker break over 90 (heavy movement)",
    "query": "pitchers with Sinker break over 90"
  },
  {
    "text": "contact over 91 & speed over 95 (elite speedster)",
    "query": "hitters with contact over 91 and speed over 95"
  },
  {
    "text": "cutter control over 95 (precise locator)",
    "query": "pitchers with Cutter control over 95"
  },
  {
    "text": "power over 92 & speed over 80 (power-speed threat)",
    "query": "hitters with power over 92 and speed over 80"
  },
  {
    "text": "k/9 over 85 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 85 and stamina over 87"
  },
  {
    "text": "contact over 96 & power over 90 (ultimate bat)",
    "query": "hitters with contact over 96 and power over 90"
  },
  {
    "text": "h/9 over 86 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 86 and bb/9 over 93"
  },
  {
    "text": "vision over 96 & clutch over 96 (clutch contact)",
    "query": "hitters with vision over 96 and clutch over 96"
  },
  {
    "text": "slider speed over 95 & slider break over 91",
    "query": "pitchers with Slider speed over 95 mph and slider break over 91"
  },
  {
    "text": "fielding over 95 & speed over 88 (elite defense)",
    "query": "hitters with fielding over 95 and speed over 88"
  },
  {
    "text": "12-6 curve control over 92 & break over 92",
    "query": "pitchers with 12-6 Curve control over 92 and break over 92"
  },
  {
    "text": "diamond hitters from Braves (power over 89)",
    "query": "diamond hitters from Braves with power over 89"
  },
  {
    "text": "pitchers from Giants (h/9 over 80)",
    "query": "pitchers from Giants with h/9 over 80"
  },
  {
    "text": "gold hitters from Phillies (speed over 90)",
    "query": "gold hitters from Phillies with speed over 90"
  },
  {
    "text": "circle change speed over 95 mph (hard velocity)",
    "query": "pitchers with Circle Change speed over 95 mph"
  },
  {
    "text": "contact over 92 & speed over 91 (elite speedster)",
    "query": "hitters with contact over 92 and speed over 91"
  },
  {
    "text": "sweeper break over 90 (heavy movement)",
    "query": "pitchers with Sweeper break over 90"
  }
];