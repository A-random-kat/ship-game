import * as THREE from "./three.module.js";

const canvas = document.querySelector("#game");
const MAX_RENDER_PIXEL_RATIO = 1.6;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8edff0);
scene.fog = new THREE.Fog(0x8edff0, 240, 980);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 4200);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();
const clock = new THREE.Clock();
const scratchV1 = new THREE.Vector3();
const scratchV2 = new THREE.Vector3();
const scratchV3 = new THREE.Vector3();
const projectileHitLocal = new THREE.Vector3();
const projectilePreviousWorld = new THREE.Vector3();
const krakenSweepStart = new THREE.Vector3();
const krakenSweepEnd = new THREE.Vector3();
const krakenSweepHitWorld = new THREE.Vector3();
const KRAKEN_PROJECTILE_HITBOXES = Object.freeze([
  { x: 0, y: 2.2, z: -6.85, rx: 5.55, ry: 2.95, rz: 2.82 },
  { x: 0, y: 1.28, z: -5.72, rx: 6.28, ry: 1.18, rz: 2.18 },
  { x: 0, y: 2.7, z: -4.25, rx: 5.85, ry: 2.75, rz: 1.65 },
  { x: 0, y: 1.16, z: -8.82, rx: 1.95, ry: 0.86, rz: 0.86 },
]);

const ui = {
  playerName: document.querySelector("#playerName"),
  playerLevel: document.querySelector("#playerLevel"),
  hpBar: document.querySelector("#hpBar"),
  hpCounter: document.querySelector("#hpCounter"),
  xpBar: document.querySelector("#xpBar"),
  statsLine: document.querySelector("#statsLine"),
  cargoList: document.querySelector("#cargoList"),
  dockPrompt: document.querySelector("#dockPrompt"),
  toast: document.querySelector("#toast"),
  shop: document.querySelector("#shop"),
  shopIsland: document.querySelector("#shopIsland"),
  shopBody: document.querySelector("#shopBody"),
  closeShop: document.querySelector("#closeShop"),
  spyPanel: document.querySelector("#spyPanel"),
  spyName: document.querySelector("#spyName"),
  spyDetails: document.querySelector("#spyDetails"),
  minimapPanel: document.querySelector("#minimapPanel"),
  minimap: document.querySelector("#minimap"),
  closeMinimap: document.querySelector("#closeMinimap"),
  openMinimap: document.querySelector("#openMinimap"),
  toggleWindMap: document.querySelector("#toggleWindMap"),
  leaderboardPanel: document.querySelector("#leaderboardPanel"),
  leaderboardList: document.querySelector("#leaderboardList"),
  closeLeaderboard: document.querySelector("#closeLeaderboard"),
  openLeaderboard: document.querySelector("#openLeaderboard"),
  ammoHotbar: document.querySelector("#ammoHotbar"),
  inventoryPanel: document.querySelector("#inventoryPanel"),
  inventoryBody: document.querySelector("#inventoryBody"),
  closeInventory: document.querySelector("#closeInventory"),
  forgePanel: document.querySelector("#forgePanel"),
  forgeBody: document.querySelector("#forgeBody"),
  closeForge: document.querySelector("#closeForge"),
  nameGate: document.querySelector("#nameGate"),
  nameForm: document.querySelector("#nameForm"),
  nameInput: document.querySelector("#captainNameInput"),
  developerTokenInput: document.querySelector("#developerTokenInput"),
  accountMini: document.querySelector("#accountMini"),
  accountPanel: document.querySelector("#accountPanel"),
  accountNameInput: document.querySelector("#accountNameInput"),
  accountPasswordInput: document.querySelector("#accountPasswordInput"),
  accountModeInput: document.querySelector("#accountModeInput"),
  accountTitle: document.querySelector("#accountPanelTitle"),
  accountStatus: document.querySelector("#accountStatus"),
  accountSubmit: document.querySelector("#accountSubmit"),
  googleAccountButton: document.querySelector("#googleAccountButton"),
  googleAccountLabel: document.querySelector("#googleAccountLabel"),
  googleButtonMount: document.querySelector("#googleButtonMount"),
  accountClose: document.querySelector("#accountClose"),
  accountOpenButtons: [...document.querySelectorAll("[data-account-open]")],
  nameButton: document.querySelector("#setSailButton") || document.querySelector("#nameForm button"),
  languageSelect: document.querySelector("#languageSelect"),
  hudLanguageSelect: document.querySelector("#hudLanguageSelect"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsClose: document.querySelector("#settingsClose"),
  settingsLanguageSelect: document.querySelector("#settingsLanguageSelect"),
  graphicsSelect: document.querySelector("#graphicsSelect"),
  beginnerGuide: document.querySelector("#beginnerGuide"),
  guideQuestion: document.querySelector("#guideQuestion"),
  guideContent: document.querySelector("#guideContent"),
  guideYes: document.querySelector("#guideYes"),
  guideNo: document.querySelector("#guideNo"),
  guideClose: document.querySelector("#guideClose"),
  tabs: [...document.querySelectorAll(".tab")],
  toolButtons: {
    cannon: document.querySelector("#toolCannon"),
    rod: document.querySelector("#toolRod"),
    glass: document.querySelector("#toolGlass"),
  },
};

const keys = new Set();
const goods = ["Silk", "Spice", "Iron", "Tea", "Pearls"];
const STARTER_SHIP = "skiff";
const MAX_PLAYER_LEVEL = 100;
const MAX_RELOAD_UPGRADES = 20;
const TRADE_SELL_RATE = 0.85;
const CRATE_DROP_MULTIPLIER = 1.2;
const KRAKEN_ATTACK_LIFE = 3.8;
const KRAKEN_SLAM_DELAY_MS = 2900;
const KRAKEN_SLAM_T = KRAKEN_SLAM_DELAY_MS / (KRAKEN_ATTACK_LIFE * 1000);
const MAP_LIMIT = 880;
const MINIMAP_VISIBLE_LIMIT = MAP_LIMIT * 1.12;
const WATERFALL_LIMIT = MINIMAP_VISIBLE_LIMIT + 720;
const ISLAND_RADIUS_SCALE = 4;
const ISLAND_SPACING_SCALE = 2.45;
const ISLAND_SPACING_ANCHOR = { x: -34, z: -24 };
const FORGE_ELEVATION = 118;
const FORGE_PRESPREAD = { x: 96, z: 606 };
const FORGE_WORLD = {
  x: ISLAND_SPACING_ANCHOR.x + (FORGE_PRESPREAD.x - ISLAND_SPACING_ANCHOR.x) * ISLAND_SPACING_SCALE,
  z: ISLAND_SPACING_ANCHOR.z + (FORGE_PRESPREAD.z - ISLAND_SPACING_ANCHOR.z) * ISLAND_SPACING_SCALE,
};
const FORGE_WATERFALL = { x: FORGE_WORLD.x - 18, z: FORGE_WORLD.z - 50 };
const COMPASS_TRAIL_SAFE_RADIUS = 640;
const COMPASS_TRAIL_SEGMENTS = 34;
const CURSED_COMPASS_PRICE = 30000;
const TORTUGA_BONUS_SHIPS = new Set(["corsairsloop", "privateerbrig", "raiderxebec"]);
const CHARACTER_SCALE = 0.187;
const CHARACTER_EYE_HEIGHT = 0.7;
const CHARACTER_MAX_HP = 1;
const WILDLIFE_SPAWN_MULTIPLIER = 5;
const PLAYER_SHIP_BOB = 0.026;
const BOT_SHIP_BOB = 0.024;
const OWNED_SHIP_BOB = 0.018;
const STARTING_FISH_COUNT = 36 * WILDLIFE_SPAWN_MULTIPLIER * 2;
const STARTING_SQUID_COUNT = 18 * WILDLIFE_SPAWN_MULTIPLIER * 2;
const MAST_SIZE_SCALE = 1.2;
const MAST_SPACING_SCALE = 1.2;
const SEA_SIZE = WATERFALL_LIMIT * 2;
const DAY_LENGTH_SECONDS = 600;
const NIGHT_LENGTH_SECONDS = 600;
const DAY_CYCLE_SECONDS = DAY_LENGTH_SECONDS + NIGHT_LENGTH_SECONDS;
const SUNRISE_SECONDS = 80;
const SUNSET_SECONDS = 95;
const WIND_MARKER_COUNT = 18;
const BALLOON_BOMB_GRAVITY = 18;
const BALLOON_BOMB_DAMAGE = 640;
const BALLOON_BOMB_BLAST_RADIUS = 12;
const BALLOON_BOMB_KNOCKBACK = 22;
const AIRBURST_DAMAGE = 60;
const AIRBURST_RADIUS = BALLOON_BOMB_BLAST_RADIUS * (2 / 3);
const BALLOON_COST = 600;
const CANNONBALL_GRAVITY = 5.2;
const GRAPESHOT_SPREAD = 0.46;
const TURTLE_FIRE_DPS = 50;
const TURTLE_FIRE_RANGE = 18;
const TURTLE_FIRE_WIDTH = 4.2;
const TURTLE_FIRE_DURATION = 8;
const TURTLE_FIRE_COOLDOWN = 20;
const TURTLE_FIRE_SMOKE = { dps: 0, duration: 0.7 };
const ROCKET_BURST_COUNT = 30;
const ROCKET_BURST_COOLDOWN = 20;
const ROCKET_BURST_INTERVAL = 0.075;
const ROCKET_BURST_SPREAD = 0.55;
const ROCKET_BURST_DAMAGE = 20;
const ROCKET_BURST_FIRE = { dps: 10, duration: 4 };
const CANNONBALL_TYPES = {
  basic: { id: "basic", name: "Basic Shell", short: "Shell", price: 0, infinite: true, pellets: 1, damageScale: 1, rangeScale: 1, spread: 0, radius: 0.35, color: 0x2f3342, trail: 0xd9fbff },
  grapeshot: { id: "grapeshot", name: "Grapeshot", short: "Grape", price: 16, pellets: 6, damageScale: 0.25, rangeScale: 0.72, spread: GRAPESHOT_SPREAD, radius: 0.18, color: 0x4a3932, trail: 0xffe4c4 },
  hotshot: { id: "hotshot", name: "Hotshot", short: "Hot", price: 23, pellets: 1, damageScale: 1, rangeScale: 1, spread: 0, radius: 0.36, color: 0xc94f3f, trail: 0xffb347, fire: { dps: 10, duration: 3 } },
  harpoon: { id: "harpoon", name: "Harpoon", short: "Harpoon", price: 20, pellets: 1, fixedDamage: 20, whaleDamage: 100, rangeScale: 0.86, spread: 0, radius: 0.16, color: 0xd8d0bd, trail: 0xf8f4e5, noRangeDamage: true },
  airburst: { id: "airburst", name: "Airburst Shell", short: "Air", price: 16, pellets: 1, fixedDamage: 0, rangeScale: 1, spread: GRAPESHOT_SPREAD, radius: 0.32, color: 0x82cfff, trail: 0xbfefff, airburst: true, noRangeDamage: true },
  rocketburst: { id: "rocketburst", name: "Rocket Burst", short: "Rocket", price: 500, pellets: 1, fixedDamage: ROCKET_BURST_DAMAGE, rangeScale: 1.85, speedScale: 1.5, spread: ROCKET_BURST_SPREAD, radius: 0.2, color: 0xd94a2e, trail: 0xff8a26, fire: ROCKET_BURST_FIRE, noRangeDamage: true, abilityOnly: true },
};
const AMMO_SLOT_TYPES = ["basic", "grapeshot", "hotshot", "harpoon", "airburst"];
const SPECIAL_AMMO_TYPES = Object.keys(CANNONBALL_TYPES).filter((id) => !CANNONBALL_TYPES[id].infinite);
const BUILD_GRID_SIZE = 3.2;
const BUILD_FLOOR_THICKNESS = 0.04;
const BUILD_FLOOR_SURFACE_Y = BUILD_FLOOR_THICKNESS;
const BUILD_WALL_DEPTH = 0.34;
const BUILD_WALL_CAP_DEPTH = BUILD_WALL_DEPTH;
const BUILD_PLACE_MAX_DISTANCE = 58;
const BUILD_EDGE_MARGIN = 2.4;
const BUILD_ITEMS = {
  flag: { id: "flag", name: "Claim Flag", price: 200, short: "Flag", description: "Claim an unnamed island and give it a name." },
  floor: { id: "floor", name: "Floor", price: 20, short: "Floor", description: "Flat deck-like flooring that snaps beside other floors." },
  wall: { id: "wall", name: "Wall", price: 20, short: "Wall", description: "A solid wall with a player collision hitbox." },
  cornerWall: { id: "cornerWall", name: "Corner Wall", price: 20, short: "Corner", description: "An L-shaped wall corner for house outlines." },
  door: { id: "door", name: "Door Wall", price: 20, short: "Door", description: "A wall piece with a doorway you can walk through." },
  roof: { id: "roof", name: "Roof", price: 20, short: "Roof", description: "A raised roof cap with a walkable top hitbox." },
  table: { id: "table", name: "Table", price: 20, short: "Table", description: "A small table with a solid collision hitbox." },
};
const BUILD_ITEM_ORDER = Object.keys(BUILD_ITEMS);
const SHOP_ITEMS = {
  cursedCompass: {
    id: "cursedCompass",
    name: "Cursed Compass",
    price: CURSED_COMPASS_PRICE,
    description: "A black compass that points to a hidden waterfall beyond the charted sea. Only one captain can carry it.",
  },
};
const LANGUAGE_OPTIONS = {
  en: "English",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};
const DEFAULT_LANGUAGE = "en";
const GRAPHICS_OPTIONS = {
  high: { labelKey: "graphicsHigh", pixelRatioCap: MAX_RENDER_PIXEL_RATIO, shadows: true, shadowMapSize: 2048, shadowType: THREE.PCFSoftShadowMap },
  medium: { labelKey: "graphicsMedium", pixelRatioCap: 1.15, shadows: true, shadowMapSize: 1024, shadowType: THREE.PCFShadowMap },
  low: { labelKey: "graphicsLow", pixelRatioCap: 0.82, shadows: false, shadowMapSize: 512, shadowType: THREE.BasicShadowMap },
};
const DEFAULT_GRAPHICS_QUALITY = "high";
const I18N = {
  en: {
    ui: {
      captainName: "Captain name", enterName: "Enter your name", developerToken: "Developer token", optional: "Optional", language: "Language", settings: "Settings", graphics: "Graphics", graphicsHigh: "High", graphicsMedium: "Medium", graphicsLow: "Low", setSail: "Set sail",
      firstVoyage: "First voyage", newQuestion: "Are you new to Islandwake?", newQuestionBody: "A short captain's guide can show you how sailing, islands, shops, fishing, combat, and loot work.", showGuide: "Yes, show guide", noSetSail: "No, set sail",
      beginnerGuide: "Beginner's guide", guideHeadline: "Survive, trade, upgrade", guideSailingTitle: "Sailing", guideSailingBody: "Use WASD to move your ship. Aim with the mouse and click to fire your selected cannon shot. The minimap shows islands, bosses, storms, balloons, and wind.",
      guideIslandsTitle: "Islands", guideIslandsBody: "Get close to an island and press T to dock. On land, press R to shop and C to set sail again. Shops sell ships, goods, cannon shots, balloons, and upgrades.",
      guideToolsTitle: "Tools", guideToolsBody: "Use 1 for cannon, 2 for fishing rod, and 3 or G for spyglass. Fish and squid bite your bait, crates and treasure can be collected, and spyglass clicks identify ships.",
      guideProgressTitle: "Progress", guideProgressBody: "Sell goods where prices are better, sink ships for crates, buy stronger ships, and spend level points on damage, reload, and range. Stay away from the Kraken and map edge early on.", startPlaying: "Start playing",
      cargo: "Cargo", noTarget: "No target", map: "Map", wind: "Wind", toggleWindMarkers: "Toggle wind markers", openMinimap: "Open minimap", gold: "Gold", openLeaderboard: "Open leaderboard", close: "Close", harborMarket: "Harbor Market",
      goodsTab: "Goods", shipsTab: "Ships", shotTab: "Shot", buildTab: "Build", upgradesTab: "Upgrades", inventory: "Inventory", snapBuild: "Snap building pieces", captain: "Captain", atSea: "At sea", swimming: "Swimming", onDeck: "On deck", docked: "Docked: {island}",
      lvlInfinite: "Lv. infinite", lvlMax: "Lv.{level} MAX", lvl: "Lv.{level}", hp: "HP", armor: "Armor", speed: "Speed", regen: "Regen", hold: "Hold", blubber: "Blubber", nets: "Nets", out: "out", in: "in", burning: "Burning {seconds}s", emptyHold: "Empty hold",
      dockingPrompt: "Docking {island}: <b>{seconds}s</b>", pressDock: "Press <b>T</b> to dock at {island}", pressSailShop: "Press <b>C</b> to set sail or <b>R</b> for the shop", pressSailBuild: "Press <b>C</b> to set sail or <b>R</b> to rotate buildings",
      unchartedShop: "{island} is uncharted. There are no shops, shipwrights, or trade goods here.", marketIntro: "{culture} market | Hold {hold}/{capacity}{blubber}. Buy low, then sell where demand is higher.", blubberInHold: " | Blubber {count} in hold",
      buy: "Buy", sell: "Sell", buyPrice: "Buy {price}g", sellPrice: "Sell {price}g", owned: "Owned {count}.", blubberTrade: "Owned {owned}. Portsmouth pays 200g each; other ports will not buy it. It uses normal cargo space unless you sail a Whaler, which can carry 50 blubber.",
      sellHere: "Sell here for {price}g.", bestKnownResale: "Best known resale is {price}g at {island}.", betterSellHere: "This is one of the better places to sell it.", possibleProfit: "{profit}g possible profit if you haul it there.", weakTradeRoute: "Buying here is not a strong trade route right now.",
      shipwrightIntro: "{island} shipwrights sell {culture} hulls. Faster ships usually have less armor; larger ships carry and push more.", price: "{price}g", sailing: "Sailing", shipStats: "HP {hp} / Armor {armor}% / Speed {speed} / Regen {regen}/s / Hold {hold}", vsYourShip: "Vs your {ship}: {stats}",
      emptySlot: "Empty", emptySlotTitle: "Empty slot", hotbarFull: "Hotbar Full", replaceAmmoPrompt: "Replace one non-basic slot with {ammo}.", slot: "Slot {slot}", basic: "Basic", hotAirBalloon: "Hot Air Balloon", balloonShopDesc: "Owned {owned}/{max}. Ballooners can launch them for scouting and bombing.", each: "{price}g each", buyFive: "Buy 5",
      buildingSupplies: "Building supplies", buildShopIntro: "Buy supplies here, then press I to open inventory. Flags claim unnamed islands; other pieces can be built on islands you own.", selected: "Selected", select: "Select", noneSelected: "No build item selected.", placeHint: "Select a piece, look at your claimed island, then press Z to place it.", claimedBy: "Claimed by {name}", unclaimedIsland: "Unnamed Island", claimNamePrompt: "Name your island", claimFirst: "Place a flag on an unnamed island first.", ownedIslandOnly: "You can only build on islands you claimed.", tooFarBuild: "Look at a spot on your docked island.", alreadyClaimed: "That island is already claimed.", buildPlaced: "{item} placed.", islandClaimed: "{island} claimed.", noBuildItem: "You do not have that building piece.", itemCount: "Owned {count}",
      upgradePoints: "Upgrade points: <b>{points}</b>", spend: "Spend", max: "Max", cannonDamage: "Cannon Damage", fireRate: "Fire Rate", cannonRange: "Cannon Range",
      speedVeryFast: "very fast", speedQuick: "quick", speedSlow: "slow", speedSteady: "steady", noArmor: "no armor", heavyArmor: "heavy armor", solidArmor: "solid armor", lightArmor: "light armor", hugeHold: "huge cargo hold", largeHold: "large cargo hold", smallHold: "small cargo hold", usefulHold: "useful cargo hold", massiveHp: "massive hull HP", highHp: "high hull HP", lightHp: "light hull HP", goodHp: "good hull HP",
      speedBuild: "Built for speed, not soaking hits.", heavyBuild: "Heavy and hard to push, but slow to reposition.", balancedBuild: "Balanced enough for trading and fights.", shipRole: "{speed} ship with {durability}, {defense}, and a {hold}. {handling}",
      hotshotDesc: "Same direct hit as Basic Shell, then burns for {dps}/s for {duration}s. Fire ignores cannon damage upgrades and moving ships burn out faster.", grapeshotDesc: "{pellets} pellets in a wide spread. Each pellet does {damage}% direct damage and reaches {range}% of cannon range. Best up close.", harpoonDesc: "Fixed 20 damage to ships. Whales take 100 damage, or 150 from a Whaler, and cannon damage upgrades do not boost it.", airburstDesc: "Explodes high above the aim point with grapeshot-like inaccuracy. Deals up to 60 balloon damage in a small blast and less near the edge.", rocketburstDesc: "Rocketeer ability ammo. Press N to launch one 30-rocket burst toward your current cursor. Each rocket deals 20 damage, flies farther and faster, and burns for 10/s for 4s.", basicDesc: "Reliable single cannonball with infinite ammo.",
      damageUpgradeDesc: "Current {damage} direct damage. Each point adds +2 direct damage; Hotshot fire stays separate.", reloadUpgradeDesc: "Current {reload}s reload. Each point lowers reload by 0.02s, up to Lv.{max}.", rangeUpgradeDesc: "Current {range}m range. Each point adds +4m. Farther hits also deal up to +50% direct damage.",
      dangerous: "Dangerous", wounded: "Wounded", manageable: "Manageable", hostile: "Hostile", crates: "Crates", distanceMeter: "{distance}m",
      spyDetails: "Lv.{level} | {distance} | {threat}<br>HP {hp}/{max} ({pct}%) | Armor {armor}%<br>Speed {speed} | Regen {regen}/s | Crates {crates}",
      toastStopShip: "Stop your ship before walking around.", toastDeckView: "Deck view. Press C for sailing controls.", toastReturnedDeck: "Returned to the deck.", toastSailingControls: "Sailing controls restored.", toastAmmoSlotEmpty: "That ammo slot is empty.", toastPutShotHotbar: "Put that shot in a hotbar slot first.", toastBasicSlot: "Basic Shell stays in slot 1.", toastWindShown: "Wind markers shown.", toastWindHidden: "Wind markers hidden.", toastGetCloser: "Get closer to an island to dock.", toastLineRetracted: "Line retracted.", toastWhalerOnly: "Only the Whaler can use side nets at sea.", toastNetsOut: "Whaler nets extended. Speed reduced.", toastNetsIn: "Whaler nets retracted.", toastDockCancel: "Docking cancelled. Stay close to the island.", toastSailsRaised: "Sails raised.", toastDockBeforeShop: "Dock at an island before shopping.", toastHoldFull: "Your hold is full.", toastBlubberFull: "Your blubber hold is full.", toastRecoveredBlubber: "Recovered whale blubber.", toastSpyShip: "Use the spyglass from your ship.", toastSpyNone: "Spyglass found no ships. Aim toward a sail.", toastNotEnoughGold: "Not enough gold.", toastNoCargoSell: "No cargo to sell.", toastBalloonMax: "You already have the maximum number of balloons.", toastBalloonBought: "Hot air balloon purchased.", toastNeedPoints: "Level up to earn upgrade points.", toastReloadMax: "Reload upgrade is maxed.", toastUpgradeInstalled: "Upgrade installed.", toastBalloonerOnly: "Only a Ballooner can launch hot air balloons.", toastThreeBalloons: "Only 3 balloons can be launched at once.", toastNoBalloons: "No spare hot air balloons.", toastBalloonLaunched: "Balloon launched. Press V to switch view.", toastShipView: "Ship view.", toastBalloonView: "Balloon view.", toastNextBalloon: "Next balloon view.", toastBalloonDescending: "Balloon descending. Keep it above the Ballooner.", toastBombUsed: "This balloon has already dropped its bomb.", toastBombAway: "Bomb away.", toastBalloonRecovered: "Balloon recovered.", toastBalloonSplash: "Balloon splashed down.", toastWaterfall: "You crossed the waterfall at the edge of the world.", toastJumpWater: "You jumped into the water. Press F to return to your ship.", toastSwimming: "You are swimming. Press F to return to your ship.", toastGoldDiggerBlock: "GoldDigger teleport blocked: island.", toastGoldDiggerMinimap: "GoldDigger minimap teleport.", toastConnected: "Connected to multiplayer waters.", toastReconnected: "Reconnected to multiplayer waters.", toastDisconnected: "Multiplayer disconnected. Reconnecting..."
    },
    goods: { Silk: "Silk", Spice: "Spice", Iron: "Iron", Tea: "Tea", Pearls: "Pearls", "Whale Blubber": "Whale Blubber" },
    ammo: { basic: "Basic Shell", grapeshot: "Grapeshot", hotshot: "Hotshot", harpoon: "Harpoon", airburst: "Airburst Shell", rocketburst: "Rocket Burst" },
    ammoShort: { basic: "Shell", grapeshot: "Grape", hotshot: "Hot", harpoon: "Harpoon", airburst: "Air", rocketburst: "Rocket" },
    entities: { Fish: "Fish", Squid: "Squid", Crate: "Crate", Treasure: "Treasure", "Kraken tentacle": "Kraken tentacle" },
    islands: { "Port Azure": "Port Azure", Vikholm: "Vikholm", Seville: "Seville", Venice: "Venice", Amsterdam: "Amsterdam", Portsmouth: "Portsmouth", Zanzibar: "Zanzibar", Canton: "Canton", Baltimore: "Baltimore", Brest: "Brest", Lisbon: "Lisbon", Calicut: "Calicut", Tonga: "Tonga", "Crown Harbor": "Crown Harbor", Blackreef: "Blackreef", "New Albion": "New Albion", "Gull Keys": "Gull Keys", "Twin Shoals": "Twin Shoals", "Mistfall Cay": "Mistfall Cay", "Broken Tooth": "Broken Tooth", Greenneedle: "Greenneedle" },
    cultures: { Freeport: "Freeport", Viking: "Viking", Spanish: "Spanish", Venetian: "Venetian", Dutch: "Dutch", "Royal Navy": "Royal Navy", "Swahili-Arab": "Swahili-Arab", Chinese: "Chinese", American: "American", French: "French", Portuguese: "Portuguese", "Indian Ocean": "Indian Ocean", Polynesian: "Polynesian", "Crown Colony": "Crown Colony", Privateer: "Privateer", Merchant: "Merchant", Uncharted: "Uncharted" },
    ships: {}
  },
  zh: {
    ui: {
      captainName: "船长姓名", enterName: "输入你的名字", developerToken: "开发者口令", optional: "可选", language: "语言", setSail: "扬帆出航",
      firstVoyage: "首次航行", newQuestion: "你是 Islandwake 的新玩家吗？", newQuestionBody: "一份简短船长指南会介绍航行、岛屿、商店、钓鱼、战斗和战利品。", showGuide: "是，显示指南", noSetSail: "否，直接出航",
      beginnerGuide: "新手指南", guideHeadline: "生存、贸易、升级", guideSailingTitle: "航行", guideSailingBody: "用 WASD 驾驶船只。用鼠标瞄准并点击发射当前炮弹。小地图会显示岛屿、首领、风暴、气球和风向。",
      guideIslandsTitle: "岛屿", guideIslandsBody: "靠近岛屿后按 T 停靠。上岸后按 R 购物，按 C 重新出海。商店出售船只、货物、炮弹、气球和升级。",
      guideToolsTitle: "工具", guideToolsBody: "按 1 使用火炮，按 2 使用鱼竿，按 3 或 G 使用望远镜。鱼和鱿鱼会咬饵，木箱和宝藏可收集，望远镜点击船只可识别目标。",
      guideProgressTitle: "进度", guideProgressBody: "把货物卖到价格更高的地方，击沉船只获得木箱，购买更强的船，并用升级点提升伤害、装填和射程。前期远离海怪和地图边缘。", startPlaying: "开始游戏",
      cargo: "货舱", noTarget: "无目标", map: "地图", wind: "风", toggleWindMarkers: "切换风向标记", openMinimap: "打开地图", gold: "金币", openLeaderboard: "打开排行榜", close: "关闭", harborMarket: "港口市场",
      goodsTab: "货物", shipsTab: "船只", shotTab: "炮弹", upgradesTab: "升级", captain: "船长", atSea: "海上", swimming: "游泳中", onDeck: "甲板上", docked: "停靠：{island}",
      lvlInfinite: "等级：无限", lvlMax: "{level}级 满级", lvl: "{level}级", hp: "耐久", armor: "护甲", speed: "速度", regen: "回复", hold: "货舱", blubber: "鲸脂", nets: "渔网", out: "展开", in: "收回", burning: "燃烧 {seconds}秒", emptyHold: "货舱为空",
      dockingPrompt: "正在停靠 {island}：<b>{seconds}秒</b>", pressDock: "按 <b>T</b> 停靠在 {island}", pressSailShop: "按 <b>C</b> 出航，或按 <b>R</b> 打开商店",
      buy: "购买", sell: "出售", buyPrice: "买 {price}金", sellPrice: "卖 {price}金", owned: "拥有 {count}。", unchartedShop: "{island} 是未知岛屿。这里没有商店、船厂或贸易货物。", marketIntro: "{culture} 市场 | 货舱 {hold}/{capacity}{blubber}。低买高卖。", blubberInHold: " | 货舱中鲸脂 {count}",
      blubberTrade: "拥有 {owned}。朴茨茅斯每个出价 200金；其他港口不收。它占普通货舱，除非你驾驶捕鲸船，可携带 50 个鲸脂。", sellHere: "此地售价 {price}金。", bestKnownResale: "已知最佳转卖价为 {price}金，地点：{island}。", betterSellHere: "这里是比较好的出售地点。", possibleProfit: "运到那里可赚 {profit}金。", weakTradeRoute: "现在在这里买入不是好路线。",
      shipwrightIntro: "{island} 的船匠出售 {culture} 船体。更快的船通常护甲更低；更大的船能载更多也更能推动别人。", price: "{price}金", sailing: "正在使用", shipStats: "耐久 {hp} / 护甲 {armor}% / 速度 {speed} / 回复 {regen}/秒 / 货舱 {hold}", vsYourShip: "对比你的 {ship}：{stats}",
      emptySlot: "空", emptySlotTitle: "空槽位", hotbarFull: "快捷栏已满", replaceAmmoPrompt: "用 {ammo} 替换一个非基础槽位。", slot: "槽位 {slot}", basic: "基础", hotAirBalloon: "热气球", balloonShopDesc: "拥有 {owned}/{max}。气球船可放出气球侦察和投弹。", each: "每个 {price}金", buyFive: "买 5 个",
      upgradePoints: "升级点：<b>{points}</b>", spend: "花费", max: "最高", cannonDamage: "火炮伤害", fireRate: "射速", cannonRange: "火炮射程",
      speedVeryFast: "极快", speedQuick: "快速", speedSlow: "缓慢", speedSteady: "稳定", noArmor: "无护甲", heavyArmor: "重护甲", solidArmor: "坚实护甲", lightArmor: "轻护甲", hugeHold: "巨大货舱", largeHold: "大货舱", smallHold: "小货舱", usefulHold: "实用货舱", massiveHp: "超高船体耐久", highHp: "高船体耐久", lightHp: "轻型船体耐久", goodHp: "不错的船体耐久",
      speedBuild: "为速度而造，不适合硬扛伤害。", heavyBuild: "沉重且难以推动，但转移很慢。", balancedBuild: "适合贸易和战斗的均衡船。", shipRole: "{speed}船只，拥有{durability}、{defense}和{hold}。{handling}",
      hotshotDesc: "直接命中伤害与基础炮弹相同，然后造成 {dps}/秒，持续 {duration}秒。燃烧不受火炮伤害升级影响，移动中的船会更快熄灭。", grapeshotDesc: "{pellets} 发散弹。每发造成 {damage}% 直接伤害，射程为火炮射程的 {range}%。近距离最佳。", harpoonDesc: "对船固定造成 20 伤害。鲸鱼受到 100 伤害，捕鲸船发射时为 150；火炮伤害升级不会增强。", airburstDesc: "在瞄准点上方爆炸，像霰弹一样不太精确。对气球最多造成 60 爆炸伤害，边缘更低。", basicDesc: "可靠的单发炮弹，弹药无限。",
      damageUpgradeDesc: "当前直接伤害 {damage}。每点 +2 直接伤害；炽热弹燃烧单独计算。", reloadUpgradeDesc: "当前装填 {reload}秒。每点减少 0.02秒，最高 Lv.{max}。", rangeUpgradeDesc: "当前射程 {range}米。每点 +4米。远距离命中最多额外 +50% 直接伤害。",
      dangerous: "危险", wounded: "受创", manageable: "可应对", hostile: "敌对", crates: "木箱", distanceMeter: "{distance}米", spyDetails: "{level}级 | {distance} | {threat}<br>耐久 {hp}/{max} ({pct}%) | 护甲 {armor}%<br>速度 {speed} | 回复 {regen}/秒 | 木箱 {crates}",
      toastStopShip: "先让船停稳，才能四处走动。", toastDeckView: "甲板视角。按 C 回到航行控制。", toastReturnedDeck: "已回到甲板。", toastSailingControls: "航行控制已恢复。", toastAmmoSlotEmpty: "这个弹药槽是空的。", toastPutShotHotbar: "先把这种炮弹放进快捷栏。", toastBasicSlot: "基础炮弹固定在 1 号槽。", toastWindShown: "已显示风向标记。", toastWindHidden: "已隐藏风向标记。", toastGetCloser: "靠近岛屿才能停靠。", toastLineRetracted: "鱼线已收回。", toastWhalerOnly: "只有捕鲸船能使用侧网。", toastNetsOut: "捕鲸船侧网已展开，速度降低。", toastNetsIn: "捕鲸船侧网已收回。", toastDockCancel: "停靠取消。请保持靠近岛屿。", toastSailsRaised: "船帆升起。", toastDockBeforeShop: "先停靠岛屿才能购物。", toastHoldFull: "货舱已满。", toastBlubberFull: "鲸脂货舱已满。", toastRecoveredBlubber: "获得鲸脂。", toastSpyShip: "望远镜只能在船上使用。", toastSpyNone: "望远镜没有发现船只。请瞄准船帆。", toastNotEnoughGold: "金币不足。", toastNoCargoSell: "没有可出售的货物。", toastBalloonMax: "你已经拥有最多数量的气球。", toastBalloonBought: "已购买热气球。", toastNeedPoints: "升级可获得升级点。", toastReloadMax: "装填升级已满。", toastUpgradeInstalled: "升级已安装。", toastBalloonerOnly: "只有气球船能放出热气球。", toastThreeBalloons: "最多只能同时放出 3 个气球。", toastNoBalloons: "没有备用热气球。", toastBalloonLaunched: "气球已发射。按 V 切换视角。", toastShipView: "船只视角。", toastBalloonView: "气球视角。", toastNextBalloon: "下一个气球视角。", toastBalloonDescending: "气球正在下降。保持在气球船上方。", toastBombUsed: "这个气球已经投过炸弹。", toastBombAway: "炸弹投下。", toastBalloonRecovered: "气球已回收。", toastBalloonSplash: "气球落水。", toastWaterfall: "你越过了世界边缘的瀑布。", toastJumpWater: "你跳进了水里。按 F 返回船上。", toastSwimming: "你正在游泳。按 F 返回船上。", toastGoldDiggerBlock: "GoldDigger 传送被岛屿阻挡。", toastGoldDiggerMinimap: "GoldDigger 小地图传送。", toastConnected: "已连接多人海域。", toastReconnected: "已重新连接多人海域。", toastDisconnected: "多人连接断开，正在重连..."
    },
    goods: { Silk: "丝绸", Spice: "香料", Iron: "铁", Tea: "茶叶", Pearls: "珍珠", "Whale Blubber": "鲸脂" },
    ammo: { basic: "基础炮弹", grapeshot: "霰弹", hotshot: "炽热弹", harpoon: "鱼叉", airburst: "空爆弹" },
    ammoShort: { basic: "炮弹", grapeshot: "霰弹", hotshot: "热弹", harpoon: "鱼叉", airburst: "空爆" },
    entities: { Fish: "鱼", Squid: "鱿鱼", Crate: "木箱", Treasure: "宝藏", "Kraken tentacle": "海怪触手" },
    islands: { "Port Azure": "蔚蓝港", Vikholm: "维克霍姆", Seville: "塞维利亚", Venice: "威尼斯", Amsterdam: "阿姆斯特丹", Portsmouth: "朴茨茅斯", Zanzibar: "桑给巴尔", Canton: "广州", Baltimore: "巴尔的摩", Brest: "布雷斯特", Lisbon: "里斯本", Calicut: "卡利卡特", Tonga: "汤加", "Crown Harbor": "王冠港", Blackreef: "黑礁", "New Albion": "新阿尔比恩", "Gull Keys": "鸥群礁", "Twin Shoals": "双浅滩", "Mistfall Cay": "雾瀑岛", "Broken Tooth": "断齿岛", Greenneedle: "绿针岛" },
    cultures: { Freeport: "自由港", Viking: "维京", Spanish: "西班牙", Venetian: "威尼斯", Dutch: "荷兰", "Royal Navy": "皇家海军", "Swahili-Arab": "斯瓦希里-阿拉伯", Chinese: "中国", American: "美洲", French: "法国", Portuguese: "葡萄牙", "Indian Ocean": "印度洋", Polynesian: "波利尼西亚", "Crown Colony": "王冠殖民地", Privateer: "私掠者", Merchant: "商人", Uncharted: "未知" },
    ships: {}
  },
  fr: {
    ui: {
      captainName: "Nom du capitaine", enterName: "Entrez votre nom", developerToken: "Jeton développeur", optional: "Facultatif", language: "Langue", setSail: "Prendre la mer",
      firstVoyage: "Premier voyage", newQuestion: "Découvres-tu Islandwake ?", newQuestionBody: "Un bref guide de capitaine peut expliquer la navigation, les îles, les boutiques, la pêche, le combat et le butin.", showGuide: "Oui, afficher le guide", noSetSail: "Non, partir",
      beginnerGuide: "Guide débutant", guideHeadline: "Survivre, commercer, améliorer", guideSailingTitle: "Navigation", guideSailingBody: "Utilise WASD pour diriger ton navire. Vise avec la souris et clique pour tirer le boulet sélectionné. La mini-carte affiche les îles, boss, orages, ballons et vents.",
      guideIslandsTitle: "Îles", guideIslandsBody: "Approche-toi d'une île et appuie sur T pour accoster. À terre, appuie sur R pour le marché et C pour repartir. Les boutiques vendent navires, marchandises, boulets, ballons et améliorations.",
      guideToolsTitle: "Outils", guideToolsBody: "Utilise 1 pour le canon, 2 pour la canne à pêche, et 3 ou G pour la longue-vue. Les poissons et calmars mordent à l'appât, les caisses et trésors se ramassent, et la longue-vue identifie les navires.",
      guideProgressTitle: "Progression", guideProgressBody: "Vends les marchandises où elles valent plus cher, coule des navires pour obtenir des caisses, achète de meilleurs navires et dépense tes points en dégâts, rechargement et portée. Évite le Kraken et le bord de carte au début.", startPlaying: "Commencer",
      cargo: "Cargaison", noTarget: "Aucune cible", map: "Carte", wind: "Vent", toggleWindMarkers: "Afficher/masquer les vents", openMinimap: "Ouvrir la carte", gold: "Or", openLeaderboard: "Ouvrir le classement", close: "Fermer", harborMarket: "Marché du port",
      goodsTab: "Marchandises", shipsTab: "Navires", shotTab: "Munitions", upgradesTab: "Améliorations", captain: "Capitaine", atSea: "En mer", swimming: "À la nage", onDeck: "Sur le pont", docked: "Accosté : {island}",
      lvlInfinite: "Niv. infini", lvlMax: "Niv.{level} MAX", lvl: "Niv.{level}", hp: "PV", armor: "Armure", speed: "Vitesse", regen: "Régén.", hold: "Cale", blubber: "Graisse", nets: "Filets", out: "sortis", in: "rentrés", burning: "En feu {seconds}s", emptyHold: "Cale vide",
      dockingPrompt: "Accostage à {island} : <b>{seconds}s</b>", pressDock: "Appuie sur <b>T</b> pour accoster à {island}", pressSailShop: "Appuie sur <b>C</b> pour partir ou <b>R</b> pour le marché",
      buy: "Acheter", sell: "Vendre", buyPrice: "Achat {price}o", sellPrice: "Vente {price}o", owned: "Possédé {count}.", unchartedShop: "{island} est inexplorée. Il n'y a ni boutiques, ni chantiers navals, ni marchandises.", marketIntro: "Marché {culture} | Cale {hold}/{capacity}{blubber}. Achète bas, vends haut.", blubberInHold: " | Graisse {count} en cale",
      blubberTrade: "Possédé {owned}. Portsmouth paie 200o pièce ; les autres ports n'en achètent pas. Elle occupe la cale normale sauf sur un baleinier, qui peut en porter 50.", sellHere: "Vente ici pour {price}o.", bestKnownResale: "Meilleure revente connue : {price}o à {island}.", betterSellHere: "C'est l'un des meilleurs endroits pour vendre.", possibleProfit: "{profit}o de profit possible si tu l'y transportes.", weakTradeRoute: "Acheter ici n'est pas une bonne route commerciale pour l'instant.",
      shipwrightIntro: "Les chantiers de {island} vendent des coques {culture}. Les navires rapides ont souvent moins d'armure ; les grands navires portent plus et poussent mieux.", price: "{price}o", sailing: "En mer", shipStats: "PV {hp} / Armure {armor}% / Vitesse {speed} / Régén. {regen}/s / Cale {hold}", vsYourShip: "Vs ton {ship} : {stats}",
      emptySlot: "Vide", emptySlotTitle: "Emplacement vide", hotbarFull: "Barre pleine", replaceAmmoPrompt: "Remplace un emplacement non basique par {ammo}.", slot: "Empl. {slot}", basic: "Basique", hotAirBalloon: "Montgolfière", balloonShopDesc: "Possédées {owned}/{max}. Les Ballooners peuvent les lancer pour explorer et bombarder.", each: "{price}o chacune", buyFive: "Acheter 5",
      upgradePoints: "Points d'amélioration : <b>{points}</b>", spend: "Dépenser", max: "Max", cannonDamage: "Dégâts du canon", fireRate: "Cadence", cannonRange: "Portée du canon",
      speedVeryFast: "très rapide", speedQuick: "rapide", speedSlow: "lent", speedSteady: "stable", noArmor: "sans armure", heavyArmor: "armure lourde", solidArmor: "bonne armure", lightArmor: "armure légère", hugeHold: "cale immense", largeHold: "grande cale", smallHold: "petite cale", usefulHold: "cale utile", massiveHp: "PV de coque énormes", highHp: "PV de coque élevés", lightHp: "coque légère", goodHp: "bons PV de coque",
      speedBuild: "Construit pour la vitesse, pas pour encaisser.", heavyBuild: "Lourd et difficile à pousser, mais lent à repositionner.", balancedBuild: "Assez équilibré pour le commerce et le combat.", shipRole: "Navire {speed} avec {durability}, {defense} et une {hold}. {handling}",
      hotshotDesc: "Même impact direct que le boulet basique, puis brûle à {dps}/s pendant {duration}s. Le feu ignore les améliorations de dégâts et s'éteint plus vite sur les navires en mouvement.", grapeshotDesc: "{pellets} projectiles en large dispersion. Chaque projectile inflige {damage}% de dégâts directs et atteint {range}% de la portée du canon. Idéal de près.", harpoonDesc: "20 dégâts fixes aux navires. Les baleines subissent 100 dégâts, ou 150 depuis un baleinier ; les améliorations de dégâts ne l'augmentent pas.", airburstDesc: "Explose au-dessus du point visé avec une imprécision de mitraille. Inflige jusqu'à 60 dégâts aux ballons dans un petit rayon.", basicDesc: "Boulet fiable, tir unique, munitions infinies.",
      damageUpgradeDesc: "Dégâts directs actuels : {damage}. Chaque point ajoute +2 ; le feu du boulet rouge est séparé.", reloadUpgradeDesc: "Rechargement actuel : {reload}s. Chaque point baisse de 0,02s, jusqu'au niv.{max}.", rangeUpgradeDesc: "Portée actuelle : {range}m. Chaque point ajoute +4m. Les tirs lointains gagnent jusqu'à +50% de dégâts directs.",
      dangerous: "Dangereux", wounded: "Blessé", manageable: "Gérable", hostile: "Hostile", crates: "Caisses", distanceMeter: "{distance}m", spyDetails: "Niv.{level} | {distance} | {threat}<br>PV {hp}/{max} ({pct}%) | Armure {armor}%<br>Vitesse {speed} | Régén. {regen}/s | Caisses {crates}"
    },
    goods: { Silk: "Soie", Spice: "Épices", Iron: "Fer", Tea: "Thé", Pearls: "Perles", "Whale Blubber": "Graisse de baleine" },
    ammo: { basic: "Boulet basique", grapeshot: "Mitraille", hotshot: "Boulet rouge", harpoon: "Harpon", airburst: "Obus airburst" },
    ammoShort: { basic: "Boulet", grapeshot: "Mitr.", hotshot: "Rouge", harpoon: "Harpon", airburst: "Air" },
    entities: { Fish: "Poisson", Squid: "Calmar", Crate: "Caisse", Treasure: "Trésor", "Kraken tentacle": "Tentacule du Kraken" },
    islands: { "Port Azure": "Port Azur", Vikholm: "Vikholm", Seville: "Séville", Venice: "Venise", Amsterdam: "Amsterdam", Portsmouth: "Portsmouth", Zanzibar: "Zanzibar", Canton: "Canton", Baltimore: "Baltimore", Brest: "Brest", Lisbon: "Lisbonne", Calicut: "Calicut", Tonga: "Tonga", "Crown Harbor": "Port de la Couronne", Blackreef: "Récif Noir", "New Albion": "Nouvelle Albion", "Gull Keys": "Îlots des Mouettes", "Twin Shoals": "Doubles Hauts-fonds", "Mistfall Cay": "Caye Brumechute", "Broken Tooth": "Dent Brisée", Greenneedle: "Aiguille Verte" },
    cultures: { Freeport: "port libre", Viking: "viking", Spanish: "espagnoles", Venetian: "vénitiennes", Dutch: "néerlandaises", "Royal Navy": "de la Royal Navy", "Swahili-Arab": "swahili-arabes", Chinese: "chinoises", American: "américaines", French: "françaises", Portuguese: "portugaises", "Indian Ocean": "de l'océan Indien", Polynesian: "polynésiennes", "Crown Colony": "coloniales", Privateer: "corsaires", Merchant: "marchandes", Uncharted: "inexplorées" },
    ships: {}
  },
  de: {
    ui: {
      captainName: "Kapitänsname", enterName: "Namen eingeben", developerToken: "Entwickler-Token", optional: "Optional", language: "Sprache", setSail: "Segel setzen",
      firstVoyage: "Erste Reise", newQuestion: "Bist du neu in Islandwake?", newQuestionBody: "Ein kurzer Kapitänsführer erklärt Segeln, Inseln, Läden, Angeln, Kampf und Beute.", showGuide: "Ja, Anleitung zeigen", noSetSail: "Nein, losfahren",
      beginnerGuide: "Anfängerführer", guideHeadline: "Überleben, handeln, aufrüsten", guideSailingTitle: "Segeln", guideSailingBody: "Steuere dein Schiff mit WASD. Ziele mit der Maus und klicke, um die gewählte Kugel abzufeuern. Die Minikarte zeigt Inseln, Bosse, Stürme, Ballons und Wind.",
      guideIslandsTitle: "Inseln", guideIslandsBody: "Fahre nah an eine Insel und drücke T zum Anlegen. An Land öffnet R den Markt und C setzt wieder Segel. Läden verkaufen Schiffe, Waren, Kugeln, Ballons und Upgrades.",
      guideToolsTitle: "Werkzeuge", guideToolsBody: "1 nutzt die Kanone, 2 die Angel, 3 oder G das Fernrohr. Fische und Kalmare beißen den Köder, Kisten und Schätze können gesammelt werden, und das Fernrohr identifiziert Schiffe.",
      guideProgressTitle: "Fortschritt", guideProgressBody: "Verkaufe Waren dort, wo sie mehr wert sind, versenke Schiffe für Kisten, kaufe stärkere Schiffe und investiere Punkte in Schaden, Nachladen und Reichweite. Meide Kraken und Kartenrand am Anfang.", startPlaying: "Spielen",
      cargo: "Ladung", noTarget: "Kein Ziel", map: "Karte", wind: "Wind", toggleWindMarkers: "Windmarkierungen umschalten", openMinimap: "Karte öffnen", gold: "Gold", openLeaderboard: "Bestenliste öffnen", close: "Schließen", harborMarket: "Hafenmarkt",
      goodsTab: "Waren", shipsTab: "Schiffe", shotTab: "Munition", upgradesTab: "Upgrades", captain: "Kapitän", atSea: "Auf See", swimming: "Schwimmen", onDeck: "An Deck", docked: "Angelegt: {island}",
      lvlInfinite: "Stufe unendlich", lvlMax: "Stufe {level} MAX", lvl: "Stufe {level}", hp: "TP", armor: "Panzerung", speed: "Tempo", regen: "Reg.", hold: "Laderaum", blubber: "Waltran", nets: "Netze", out: "aus", in: "ein", burning: "Brennt {seconds}s", emptyHold: "Laderaum leer",
      dockingPrompt: "Anlegen bei {island}: <b>{seconds}s</b>", pressDock: "Drücke <b>T</b>, um bei {island} anzulegen", pressSailShop: "Drücke <b>C</b> zum Auslaufen oder <b>R</b> für den Laden",
      buy: "Kaufen", sell: "Verkaufen", buyPrice: "Kauf {price}g", sellPrice: "Verkauf {price}g", owned: "Besitz {count}.", unchartedShop: "{island} ist unerforscht. Hier gibt es keine Läden, Werften oder Handelswaren.", marketIntro: "{culture}-Markt | Laderaum {hold}/{capacity}{blubber}. Billig kaufen, teuer verkaufen.", blubberInHold: " | Waltran {count} im Laderaum",
      blubberTrade: "Besitz {owned}. Portsmouth zahlt 200g pro Stück; andere Häfen kaufen es nicht. Es nutzt normalen Laderaum, außer auf einem Walfänger, der 50 tragen kann.", sellHere: "Hier für {price}g verkaufen.", bestKnownResale: "Bester bekannter Wiederverkauf: {price}g in {island}.", betterSellHere: "Dies ist einer der besseren Verkaufsorte.", possibleProfit: "{profit}g möglicher Gewinn, wenn du es dorthin bringst.", weakTradeRoute: "Hier zu kaufen ist derzeit keine gute Handelsroute.",
      shipwrightIntro: "Die Werften von {island} verkaufen {culture}e Rümpfe. Schnellere Schiffe haben meist weniger Panzerung; größere tragen mehr und schieben stärker.", price: "{price}g", sailing: "Aktiv", shipStats: "TP {hp} / Panzerung {armor}% / Tempo {speed} / Reg. {regen}/s / Laderaum {hold}", vsYourShip: "Gegen dein {ship}: {stats}",
      emptySlot: "Leer", emptySlotTitle: "Leerer Platz", hotbarFull: "Leiste voll", replaceAmmoPrompt: "Ersetze einen Nicht-Basis-Platz mit {ammo}.", slot: "Platz {slot}", basic: "Basis", hotAirBalloon: "Heißluftballon", balloonShopDesc: "Besitz {owned}/{max}. Ballooner können sie zum Erkunden und Bombardieren starten.", each: "{price}g pro Stück", buyFive: "5 kaufen",
      upgradePoints: "Upgradepunkte: <b>{points}</b>", spend: "Ausgeben", max: "Max", cannonDamage: "Kanonenschaden", fireRate: "Feuerrate", cannonRange: "Kanonereichweite",
      speedVeryFast: "sehr schnelles", speedQuick: "schnelles", speedSlow: "langsames", speedSteady: "stabiles", noArmor: "keine Panzerung", heavyArmor: "schwere Panzerung", solidArmor: "solide Panzerung", lightArmor: "leichte Panzerung", hugeHold: "riesiger Laderaum", largeHold: "großer Laderaum", smallHold: "kleiner Laderaum", usefulHold: "nützlicher Laderaum", massiveHp: "massive Rumpf-TP", highHp: "hohe Rumpf-TP", lightHp: "leichte Rumpf-TP", goodHp: "gute Rumpf-TP",
      speedBuild: "Für Tempo gebaut, nicht zum Einstecken.", heavyBuild: "Schwer und kaum zu schieben, aber langsam beim Umsetzen.", balancedBuild: "Ausgewogen genug für Handel und Kämpfe.", shipRole: "{speed} Schiff mit {durability}, {defense} und {hold}. {handling}",
      hotshotDesc: "Gleicher Direkttreffer wie Basis-Kugel, danach {dps}/s Feuer für {duration}s. Feuer ignoriert Schadens-Upgrades und erlischt bei bewegten Schiffen schneller.", grapeshotDesc: "{pellets} Projektile in breiter Streuung. Jedes verursacht {damage}% Direktschaden und erreicht {range}% Reichweite. Am besten nah.", harpoonDesc: "20 fester Schaden gegen Schiffe. Wale nehmen 100 Schaden, oder 150 vom Walfänger; Schadens-Upgrades erhöhen es nicht.", airburstDesc: "Explodiert hoch über dem Zielpunkt mit Kartätschen-Ungenauigkeit. Bis zu 60 Ballonschaden in kleinem Radius.", basicDesc: "Zuverlässige Einzelkugel mit unendlicher Munition.",
      damageUpgradeDesc: "Aktueller Direktschaden {damage}. Jeder Punkt gibt +2; Hotshot-Feuer bleibt separat.", reloadUpgradeDesc: "Aktuelles Nachladen {reload}s. Jeder Punkt senkt um 0,02s, bis Stufe {max}.", rangeUpgradeDesc: "Aktuelle Reichweite {range}m. Jeder Punkt gibt +4m. Weite Treffer verursachen bis zu +50% Direktschaden.",
      dangerous: "Gefährlich", wounded: "Verwundet", manageable: "Machbar", hostile: "Feindlich", crates: "Kisten", distanceMeter: "{distance}m", spyDetails: "Stufe {level} | {distance} | {threat}<br>TP {hp}/{max} ({pct}%) | Panzerung {armor}%<br>Tempo {speed} | Reg. {regen}/s | Kisten {crates}"
    },
    goods: { Silk: "Seide", Spice: "Gewürze", Iron: "Eisen", Tea: "Tee", Pearls: "Perlen", "Whale Blubber": "Waltran" },
    ammo: { basic: "Basis-Kugel", grapeshot: "Kartätsche", hotshot: "Glühkugel", harpoon: "Harpune", airburst: "Luftdetonation" },
    ammoShort: { basic: "Kugel", grapeshot: "Kart.", hotshot: "Glüh", harpoon: "Harp.", airburst: "Luft" },
    entities: { Fish: "Fisch", Squid: "Kalmar", Crate: "Kiste", Treasure: "Schatz", "Kraken tentacle": "Kraken-Tentakel" },
    islands: { "Port Azure": "Azurhafen", Vikholm: "Vikholm", Seville: "Sevilla", Venice: "Venedig", Amsterdam: "Amsterdam", Portsmouth: "Portsmouth", Zanzibar: "Sansibar", Canton: "Kanton", Baltimore: "Baltimore", Brest: "Brest", Lisbon: "Lissabon", Calicut: "Kalikut", Tonga: "Tonga", "Crown Harbor": "Kronenhafen", Blackreef: "Schwarzriff", "New Albion": "Neu-Albion", "Gull Keys": "Möweninseln", "Twin Shoals": "Zwillingsbänke", "Mistfall Cay": "Nebelfall-Cay", "Broken Tooth": "Gebrochener Zahn", Greenneedle: "Grüne Nadel" },
    cultures: { Freeport: "Freihafen", Viking: "Wikinger", Spanish: "spanisch", Venetian: "venezianisch", Dutch: "niederländisch", "Royal Navy": "Royal-Navy", "Swahili-Arab": "swahili-arabisch", Chinese: "chinesisch", American: "amerikanisch", French: "französisch", Portuguese: "portugiesisch", "Indian Ocean": "Indischer-Ozean", Polynesian: "polynesisch", "Crown Colony": "Kronkolonie", Privateer: "Freibeuter", Merchant: "Händler", Uncharted: "unerforscht" },
    ships: {}
  },
  es: {
    ui: {
      captainName: "Nombre del capitán", enterName: "Escribe tu nombre", developerToken: "Token de desarrollador", optional: "Opcional", language: "Idioma", setSail: "Zarpar",
      firstVoyage: "Primer viaje", newQuestion: "¿Eres nuevo en Islandwake?", newQuestionBody: "Una guía breve puede enseñarte navegación, islas, tiendas, pesca, combate y botín.", showGuide: "Sí, mostrar guía", noSetSail: "No, zarpar",
      beginnerGuide: "Guía para principiantes", guideHeadline: "Sobrevive, comercia, mejora", guideSailingTitle: "Navegación", guideSailingBody: "Usa WASD para mover tu barco. Apunta con el ratón y haz clic para disparar la munición seleccionada. El minimapa muestra islas, jefes, tormentas, globos y viento.",
      guideIslandsTitle: "Islas", guideIslandsBody: "Acércate a una isla y pulsa T para atracar. En tierra, pulsa R para comprar y C para volver a zarpar. Las tiendas venden barcos, mercancías, munición, globos y mejoras.",
      guideToolsTitle: "Herramientas", guideToolsBody: "Usa 1 para cañón, 2 para caña de pescar, y 3 o G para catalejo. Peces y calamares muerden el cebo, cajas y tesoros se recogen, y el catalejo identifica barcos.",
      guideProgressTitle: "Progreso", guideProgressBody: "Vende mercancías donde valgan más, hunde barcos para obtener cajas, compra barcos mejores y usa puntos en daño, recarga y alcance. Al principio evita el Kraken y el borde del mapa.", startPlaying: "Empezar",
      cargo: "Carga", noTarget: "Sin objetivo", map: "Mapa", wind: "Viento", toggleWindMarkers: "Alternar viento", openMinimap: "Abrir mapa", gold: "Oro", openLeaderboard: "Abrir clasificación", close: "Cerrar", harborMarket: "Mercado del puerto",
      goodsTab: "Mercancías", shipsTab: "Barcos", shotTab: "Munición", upgradesTab: "Mejoras", captain: "Capitán", atSea: "En el mar", swimming: "Nadando", onDeck: "En cubierta", docked: "Atracado: {island}",
      lvlInfinite: "Niv. infinito", lvlMax: "Niv.{level} MAX", lvl: "Niv.{level}", hp: "PV", armor: "Blindaje", speed: "Velocidad", regen: "Reg.", hold: "Bodega", blubber: "Grasa", nets: "Redes", out: "fuera", in: "dentro", burning: "Ardiendo {seconds}s", emptyHold: "Bodega vacía",
      dockingPrompt: "Atracando en {island}: <b>{seconds}s</b>", pressDock: "Pulsa <b>T</b> para atracar en {island}", pressSailShop: "Pulsa <b>C</b> para zarpar o <b>R</b> para la tienda",
      buy: "Comprar", sell: "Vender", buyPrice: "Comprar {price}o", sellPrice: "Vender {price}o", owned: "Tienes {count}.", unchartedShop: "{island} está sin cartografiar. No hay tiendas, astilleros ni mercancías.", marketIntro: "Mercado {culture} | Bodega {hold}/{capacity}{blubber}. Compra barato y vende caro.", blubberInHold: " | Grasa {count} en bodega",
      blubberTrade: "Tienes {owned}. Portsmouth paga 200o cada una; otros puertos no la compran. Usa bodega normal salvo en un ballenero, que puede llevar 50.", sellHere: "Vender aquí por {price}o.", bestKnownResale: "Mejor reventa conocida: {price}o en {island}.", betterSellHere: "Este es uno de los mejores sitios para venderlo.", possibleProfit: "{profit}o de ganancia posible si lo llevas allí.", weakTradeRoute: "Comprar aquí no es una buena ruta ahora.",
      shipwrightIntro: "Los astilleros de {island} venden cascos {culture}. Los barcos rápidos suelen tener menos blindaje; los grandes cargan y empujan más.", price: "{price}o", sailing: "Navegando", shipStats: "PV {hp} / Blindaje {armor}% / Vel. {speed} / Reg. {regen}/s / Bodega {hold}", vsYourShip: "Vs tu {ship}: {stats}",
      emptySlot: "Vacío", emptySlotTitle: "Ranura vacía", hotbarFull: "Barra llena", replaceAmmoPrompt: "Reemplaza una ranura no básica con {ammo}.", slot: "Ranura {slot}", basic: "Básica", hotAirBalloon: "Globo aerostático", balloonShopDesc: "Tienes {owned}/{max}. Los Ballooner pueden lanzarlos para explorar y bombardear.", each: "{price}o cada uno", buyFive: "Comprar 5",
      upgradePoints: "Puntos de mejora: <b>{points}</b>", spend: "Gastar", max: "Máx", cannonDamage: "Daño de cañón", fireRate: "Cadencia", cannonRange: "Alcance de cañón",
      speedVeryFast: "muy rápido", speedQuick: "rápido", speedSlow: "lento", speedSteady: "estable", noArmor: "sin blindaje", heavyArmor: "blindaje pesado", solidArmor: "blindaje sólido", lightArmor: "blindaje ligero", hugeHold: "bodega enorme", largeHold: "bodega grande", smallHold: "bodega pequeña", usefulHold: "bodega útil", massiveHp: "PV de casco enormes", highHp: "PV de casco altos", lightHp: "PV de casco ligeros", goodHp: "buenos PV de casco",
      speedBuild: "Hecho para velocidad, no para aguantar golpes.", heavyBuild: "Pesado y difícil de empujar, pero lento para reposicionarse.", balancedBuild: "Equilibrado para comercio y combates.", shipRole: "Barco {speed} con {durability}, {defense} y {hold}. {handling}",
      hotshotDesc: "Mismo impacto directo que la munición básica, luego quema {dps}/s durante {duration}s. El fuego ignora mejoras de daño y se apaga antes si el barco se mueve.", grapeshotDesc: "{pellets} proyectiles con dispersión amplia. Cada uno hace {damage}% de daño directo y llega al {range}% del alcance. Mejor de cerca.", harpoonDesc: "20 de daño fijo a barcos. Las ballenas reciben 100, o 150 desde un ballenero; las mejoras de daño no lo aumentan.", airburstDesc: "Explota sobre el punto apuntado con imprecisión similar a metralla. Hace hasta 60 de daño a globos en un radio pequeño.", basicDesc: "Munición simple y fiable con disparos infinitos.",
      damageUpgradeDesc: "Daño directo actual {damage}. Cada punto añade +2; el fuego de Hotshot va aparte.", reloadUpgradeDesc: "Recarga actual {reload}s. Cada punto reduce 0.02s, hasta niv.{max}.", rangeUpgradeDesc: "Alcance actual {range}m. Cada punto añade +4m. Los impactos lejanos hacen hasta +50% de daño directo.",
      dangerous: "Peligroso", wounded: "Herido", manageable: "Manejable", hostile: "Hostil", crates: "Cajas", distanceMeter: "{distance}m", spyDetails: "Niv.{level} | {distance} | {threat}<br>PV {hp}/{max} ({pct}%) | Blindaje {armor}%<br>Vel. {speed} | Reg. {regen}/s | Cajas {crates}"
    },
    goods: { Silk: "Seda", Spice: "Especias", Iron: "Hierro", Tea: "Té", Pearls: "Perlas", "Whale Blubber": "Grasa de ballena" },
    ammo: { basic: "Bala básica", grapeshot: "Metralla", hotshot: "Bala incendiaria", harpoon: "Arpón", airburst: "Bala airburst" },
    ammoShort: { basic: "Bala", grapeshot: "Metr.", hotshot: "Fuego", harpoon: "Arpón", airburst: "Aire" },
    entities: { Fish: "Pez", Squid: "Calamar", Crate: "Caja", Treasure: "Tesoro", "Kraken tentacle": "Tentáculo del Kraken" },
    islands: { "Port Azure": "Puerto Azur", Vikholm: "Vikholm", Seville: "Sevilla", Venice: "Venecia", Amsterdam: "Ámsterdam", Portsmouth: "Portsmouth", Zanzibar: "Zanzíbar", Canton: "Cantón", Baltimore: "Baltimore", Brest: "Brest", Lisbon: "Lisboa", Calicut: "Calicut", Tonga: "Tonga", "Crown Harbor": "Puerto Corona", Blackreef: "Arrecife Negro", "New Albion": "Nueva Albión", "Gull Keys": "Cayos Gaviota", "Twin Shoals": "Bajos Gemelos", "Mistfall Cay": "Cayo Brumacaída", "Broken Tooth": "Diente Roto", Greenneedle: "Aguja Verde" },
    cultures: { Freeport: "puerto libre", Viking: "vikingos", Spanish: "españoles", Venetian: "venecianos", Dutch: "neerlandeses", "Royal Navy": "de la Marina Real", "Swahili-Arab": "suajili-árabes", Chinese: "chinos", American: "americanos", French: "franceses", Portuguese: "portugueses", "Indian Ocean": "del Índico", Polynesian: "polinesios", "Crown Colony": "coloniales", Privateer: "corsarios", Merchant: "mercantes", Uncharted: "sin cartografiar" },
    ships: {}
  },
};
function spreadIslandData(data) {
  return {
    ...data,
    x: ISLAND_SPACING_ANCHOR.x + (data.x - ISLAND_SPACING_ANCHOR.x) * ISLAND_SPACING_SCALE,
    z: ISLAND_SPACING_ANCHOR.z + (data.z - ISLAND_SPACING_ANCHOR.z) * ISLAND_SPACING_SCALE,
  };
}

const islandData = [
  { name: "Port Azure", culture: "Freeport", x: -34, z: -24, radius: 20, color: 0x7dcf7a, accent: 0x2f87a5, theme: "starter", shipMarket: ["shallop", "pinnace", "hoy", "yawl", "balinger", "cog", "ketch"], goods: { Silk: 32, Spice: 57, Iron: 38, Tea: 24, Pearls: 88 } },
  { name: "Vikholm", culture: "Viking", x: -184, z: -122, radius: 23, color: 0x86ba73, accent: 0xbd463b, theme: "norse", shipMarket: ["longship", "knarr", "dogger", "balinger"], goods: { Silk: 38, Spice: 83, Iron: 80, Tea: 46, Pearls: 76 } },
  { name: "Seville", culture: "Spanish", x: 182, z: -138, radius: 24, color: 0xd4ad65, accent: 0xc94f3f, theme: "iberian", shipMarket: ["caravel", "carrack", "merchantman"], goods: { Silk: 64, Spice: 38, Iron: 48, Tea: 68, Pearls: 112 } },
  { name: "Venice", culture: "Venetian", x: 116, z: 142, radius: 21, color: 0x82bd72, accent: 0xd7b44a, theme: "lagoon", shipMarket: ["galley", "tartane", "polacre", "xebec", "brigantine"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Amsterdam", culture: "Dutch", x: -142, z: 118, radius: 22, color: 0x68b779, accent: 0xe08d3f, theme: "trade", shipMarket: ["hoy", "dogger", "bilander", "chassemaree", "fluyt", "barque", "barquentine"], goods: { Silk: 74, Spice: 48, Iron: 96, Tea: 57, Pearls: 84 } },
  { name: "Portsmouth", culture: "Royal Navy", x: 36, z: 226, radius: 24, color: 0x6fa36a, accent: 0x4051a8, theme: "naval", shipMarket: ["storm", "sixthrate", "corvette", "frigate", "postship", "whaler", "razee", "ballooner", "fourthrate", "grandfrigate", "manowar", "windrunner", "firstrate"], goods: { Silk: 48, Spice: 102, Iron: 72, Tea: 35, Pearls: 126 } },
  { name: "Zanzibar", culture: "Swahili-Arab", x: 226, z: 28, radius: 20, color: 0x88c478, accent: 0xf0d05a, theme: "dhow", shipMarket: ["dhow", "felucca", "tartane", "polacre", "xebec"], goods: { Silk: 70, Spice: 30, Iron: 54, Tea: 63, Pearls: 132 } },
  { name: "Canton", culture: "Chinese", x: -222, z: 32, radius: 22, color: 0x68c46f, accent: 0xc93636, theme: "pagoda", shipMarket: ["junk", "treasure", "turtle"], goods: { Silk: 42, Spice: 70, Iron: 67, Tea: 95, Pearls: 143 } },
  { name: "Baltimore", culture: "American", x: -26, z: -214, radius: 20, color: 0x75caa5, accent: 0x58c6f2, theme: "schooner", shipMarket: ["schooner", "packet", "clipper", "sloop", "ballooner", "windrunner"], goods: { Silk: 91, Spice: 54, Iron: 34, Tea: 82, Pearls: 109 } },
  { name: "Brest", culture: "French", x: 104, z: -224, radius: 21, color: 0x91c96d, accent: 0x4c64a6, theme: "fort", shipMarket: ["brig", "brigantine", "snow", "chassemaree", "barquentine", "sixthrate", "corvette"], goods: { Silk: 69, Spice: 42, Iron: 62, Tea: 66, Pearls: 130 } },
  { name: "Lisbon", culture: "Portuguese", x: -232, z: -204, radius: 22, color: 0xbac96d, accent: 0xd2a94b, theme: "iberian", shipMarket: ["caravel", "pink", "polacre", "carrack", "galleon"], goods: { Silk: 52, Spice: 34, Iron: 60, Tea: 58, Pearls: 118 } },
  { name: "Calicut", culture: "Indian Ocean", x: 214, z: 210, radius: 22, color: 0x92d37e, accent: 0xda9c5c, theme: "market", shipMarket: ["dhow", "ketch", "merchantman", "eastindiaman"], goods: { Silk: 82, Spice: 44, Iron: 72, Tea: 36, Pearls: 120 } },
  { name: "Tonga", culture: "Polynesian", x: 4, z: 84, radius: 18, color: 0x5fa66a, accent: 0xef6f4f, theme: "atoll", shipMarket: ["cat", "sloop", "lugger"], goods: { Silk: 61, Spice: 64, Iron: 46, Tea: 75, Pearls: 94 } },
  { name: "Crown Harbor", culture: "Crown Colony", x: 164, z: -22, radius: 21, color: 0x82bd72, accent: 0xd99928, theme: "fort", shipMarket: ["dart", "storm", "brig", "bombketch", "sixthrate", "frigate", "rocketeer"], goods: { Silk: 58, Spice: 92, Iron: 61, Tea: 28, Pearls: 121 } },
  { name: "Blackreef", culture: "Privateer", x: -96, z: 216, radius: 20, color: 0x5fa66a, accent: 0x3f87a6, theme: "rocky", shipMarket: ["dart", "lugger", "brigantine", "xebec"], goods: { Silk: 78, Spice: 52, Iron: 101, Tea: 55, Pearls: 86 } },
  { name: "New Albion", culture: "Merchant", x: 246, z: -222, radius: 21, color: 0x70bf61, accent: 0xb5773c, theme: "trade", shipMarket: ["sloop", "packet", "chassemaree", "barque", "postship", "merchantman", "whaler", "eastindiaman", "grandfrigate"], goods: { Silk: 46, Spice: 80, Iron: 66, Tea: 98, Pearls: 142 } },
  { name: "Tortuga", culture: "Privateer", x: -328, z: 126, radius: 20, color: 0x5e9f6d, accent: 0x2b2f39, theme: "privateer", shipMarket: ["corsairsloop", "privateerbrig", "raiderxebec"], goods: { Silk: 86, Spice: 58, Iron: 88, Tea: 52, Pearls: 118 } },
  { name: "Forge", culture: "Ancient", x: FORGE_PRESPREAD.x, z: FORGE_PRESPREAD.z, radius: 17, color: 0xa9cf7a, accent: 0xe7c55a, theme: "forge", forge: true, noMinimap: true, hiddenLabel: true, shipMarket: [], goods: {} },
  { name: "Gull Keys", culture: "Uncharted", x: -308, z: 14, radius: 7, color: 0x6aa86a, accent: 0xd7b44a, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Twin Shoals", culture: "Uncharted", x: 298, z: 88, radius: 8, color: 0x82bd72, accent: 0xefc27c, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Mistfall Cay", culture: "Uncharted", x: 6, z: -326, radius: 6, color: 0x75caa5, accent: 0x58c6f2, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Broken Tooth", culture: "Uncharted", x: -286, z: 268, radius: 9, color: 0x6f9b68, accent: 0x4f5963, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Greenneedle", culture: "Uncharted", x: 312, z: -72, radius: 7, color: 0x68b779, accent: 0x2f6b48, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Shellhook Isle", culture: "Uncharted", x: -418, z: -62, radius: 8, color: 0x71b875, accent: 0xf0d05a, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Far Lantern", culture: "Uncharted", x: 424, z: 228, radius: 7, color: 0x83c16d, accent: 0xfff1a6, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Saltglass Cay", culture: "Uncharted", x: -392, z: -328, radius: 6, color: 0x75caa5, accent: 0xbdefff, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Needle Shoal", culture: "Uncharted", x: 374, z: -354, radius: 8, color: 0x6f9b68, accent: 0x4f5963, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Moonjaw Rocks", culture: "Uncharted", x: -108, z: 386, radius: 7, color: 0x5f9467, accent: 0xa4c9e8, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Bluecap Isle", culture: "Uncharted", x: 184, z: 388, radius: 9, color: 0x62b983, accent: 0x58c6f2, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Driftwood Cay", culture: "Uncharted", x: 442, z: -48, radius: 7, color: 0x88c478, accent: 0xb77b42, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Copper Atoll", culture: "Uncharted", x: -448, z: 178, radius: 8, color: 0x90ba68, accent: 0xd99928, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Amber Shoal", culture: "Uncharted", x: -116, z: -92, radius: 5.6, color: 0x74bd72, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Fernhook Islet", culture: "Uncharted", x: 86, z: -112, radius: 5.2, color: 0x6fbf8a, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Morrow Rock", culture: "Uncharted", x: -44, z: 76, radius: 4.8, color: 0x89c76d, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Clearwater Key", culture: "Uncharted", x: 122, z: 84, radius: 5.4, color: 0x70b976, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Lowtide Holm", culture: "Uncharted", x: -156, z: 46, radius: 5.1, color: 0x75caa5, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Driftmark Cay", culture: "Uncharted", x: -282, z: 108, radius: 5.8, color: 0x77b56c, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Northwind Cay", culture: "Uncharted", x: 284, z: 150, radius: 5.5, color: 0x72bf8e, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Coralhook Isle", culture: "Uncharted", x: -196, z: -294, radius: 5.3, color: 0x8bc36d, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Redcap Shoal", culture: "Uncharted", x: 190, z: 326, radius: 5.0, color: 0x69bd80, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Seabriar Rock", culture: "Uncharted", x: 358, z: -190, radius: 4.9, color: 0x91c96d, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
  { name: "Starling Cay", culture: "Uncharted", x: -368, z: -150, radius: 5.4, color: 0x6bbd83, accent: 0xf3d178, theme: "islet", exploreOnly: true, shipMarket: [], goods: {} },
].map(spreadIslandData);

const whaleZonePortAzure = islandData.find((island) => island.name === "Port Azure") || { z: -24 };
const whaleZoneBaltimore = islandData.find((island) => island.name === "Baltimore") || { z: -280 };
const WHALE_NORTH_MIN_Z = Math.min(whaleZonePortAzure.z, whaleZoneBaltimore.z) - 42;
const WHALE_NORTH_MAX_Z = Math.max(whaleZonePortAzure.z, whaleZoneBaltimore.z) + 10;
const WHALE_NORTH_CENTER_Z = (WHALE_NORTH_MIN_Z + WHALE_NORTH_MAX_Z) * 0.5;

const shipCatalog = [
  { id: "skiff", name: "Skiff", price: 0, hp: 145, armor: 0.02, speed: 15, regen: 1.6, color: 0xcc4e3f, model: "skiff" },
  { id: "shallop", name: "Shallop", price: 380, hp: 165, armor: 0.02, speed: 17, regen: 1.7, color: 0xb86d3d, model: "skiff" },
  { id: "pinnace", name: "Pinnace", price: 520, hp: 185, armor: 0.03, speed: 20, regen: 1.8, color: 0x5b9eb5, model: "dart" },
  { id: "hoy", name: "Hoy", price: 680, hp: 220, armor: 0.04, speed: 11, regen: 1.9, color: 0xb0824a, model: "cog" },
  { id: "yawl", name: "Yawl", price: 950, hp: 195, armor: 0.02, speed: 18, regen: 1.6, color: 0x7db0a6, model: "skiff" },
  { id: "balinger", name: "Balinger", price: 1250, hp: 240, armor: 0.04, speed: 14, regen: 1.9, color: 0xb5894e, model: "cog" },
  { id: "felucca", name: "Felucca", price: 1850, hp: 215, armor: 0.02, speed: 25, regen: 1.7, color: 0xe2bc55, model: "dhow" },
  { id: "bilander", name: "Bilander", price: 2150, hp: 280, armor: 0.05, speed: 16, regen: 2.1, color: 0x84a76c, model: "snow" },
  { id: "cog", name: "Cog", price: 880, hp: 260, armor: 0.06, speed: 10, regen: 2.0, color: 0xa86e3a, model: "cog" },
  { id: "longship", name: "Longship", price: 980, hp: 205, armor: 0.03, speed: 24, regen: 1.8, color: 0xc84f3f, model: "longship" },
  { id: "dogger", name: "Dogger", price: 1120, hp: 230, armor: 0.04, speed: 18, regen: 1.9, color: 0x7c9a7e, model: "lugger" },
  { id: "dhow", name: "Dhow", price: 1250, hp: 235, armor: 0.03, speed: 19, regen: 2.2, color: 0xf0d05a, model: "dhow" },
  { id: "sloop", name: "Sloop", price: 1420, hp: 225, armor: 0.04, speed: 27, regen: 1.8, color: 0x4aa5c6, model: "storm" },
  { id: "knarr", name: "Knarr", price: 1580, hp: 290, armor: 0.06, speed: 12, regen: 2.2, color: 0x9b6b35, model: "knarr" },
  { id: "lugger", name: "Lugger", price: 1720, hp: 245, armor: 0.04, speed: 22, regen: 2.0, color: 0x4f9a9a, model: "lugger" },
  { id: "tartane", name: "Tartane", price: 1880, hp: 250, armor: 0.04, speed: 24, regen: 2.0, color: 0xc96446, model: "xebec" },
  { id: "pink", name: "Pink", price: 2050, hp: 300, armor: 0.06, speed: 15, regen: 2.3, color: 0xc88b58, model: "caravel" },
  { id: "cat", name: "Catamaran", price: 2180, hp: 210, armor: 0.02, speed: 28, regen: 1.8, color: 0xef6f4f, model: "cat" },
  { id: "dart", name: "Cutter", price: 2350, hp: 230, armor: 0.04, speed: 30, regen: 1.7, color: 0x35a9b5, model: "dart" },
  { id: "junk", name: "Junk", price: 2520, hp: 330, armor: 0.07, speed: 15, regen: 2.8, color: 0x4aa66b, model: "junk" },
  { id: "ketch", name: "Ketch", price: 2720, hp: 340, armor: 0.06, speed: 16, regen: 2.5, color: 0xc58e45, model: "caravel" },
  { id: "schooner", name: "Schooner", price: 2920, hp: 300, armor: 0.05, speed: 26, regen: 2.1, color: 0x58c6f2, model: "schooner" },
  { id: "modernschooner", name: "Modern Schooner", price: 100, hp: 500, armor: 0, speed: 40, regen: 2.0, color: 0xf8f8f2, model: "modernschooner" },
  { id: "galley", name: "Galley", price: 3150, hp: 310, armor: 0.04, speed: 23, regen: 2.2, color: 0xd7b44a, model: "galley" },
  { id: "xebec", name: "Xebec", price: 3380, hp: 320, armor: 0.05, speed: 29, regen: 2.1, color: 0xd45f3f, model: "xebec" },
  { id: "corsairsloop", name: "Corsair Sloop", price: 7800, hp: 1120, armor: 0.02, speed: 32, regen: 2.0, color: 0x253447, model: "storm" },
  { id: "privateerbrig", name: "Privateer Brig", price: 12800, hp: 1750, armor: 0.04, speed: 27, regen: 3.0, color: 0x354f58, model: "brig" },
  { id: "raiderxebec", name: "Raider Xebec", price: 18200, hp: 2150, armor: 0.02, speed: 34, regen: 3.0, color: 0x4f2d36, model: "xebec" },
  { id: "brigantine", name: "Brigantine", price: 3650, hp: 360, armor: 0.07, speed: 22, regen: 2.3, color: 0x3f87a6, model: "brig" },
  { id: "caravel", name: "Caravel", price: 3920, hp: 390, armor: 0.08, speed: 16, regen: 2.6, color: 0xd2a94b, model: "caravel" },
  { id: "snow", name: "Snow", price: 4250, hp: 430, armor: 0.09, speed: 19, regen: 2.5, color: 0xa4c9e8, model: "snow" },
  { id: "packet", name: "Packet Ship", price: 4550, hp: 350, armor: 0.05, speed: 27, regen: 2.0, color: 0x67bdd8, model: "schooner" },
  { id: "chassemaree", name: "Chasse-Maree", price: 4720, hp: 330, armor: 0.04, speed: 28, regen: 2.0, color: 0x6fc8c3, model: "schooner" },
  { id: "barquentine", name: "Barquentine", price: 4850, hp: 400, armor: 0.07, speed: 24, regen: 2.2, color: 0x82b26a, model: "snow" },
  { id: "clipper", name: "Clipper", price: 5050, hp: 360, armor: 0.04, speed: 33, regen: 1.9, color: 0xe2aa32, model: "clipper" },
  { id: "fluyt", name: "Fluyt", price: 5200, hp: 500, armor: 0.08, speed: 13, regen: 2.8, color: 0xd18b45, model: "fluyt" },
  { id: "polacre", name: "Polacre", price: 5350, hp: 430, armor: 0.06, speed: 24, regen: 2.3, color: 0xde7f4d, model: "xebec" },
  { id: "bombketch", name: "Bomb Ketch", price: 5600, hp: 560, armor: 0.11, speed: 10, regen: 2.7, color: 0x75856f, model: "turtle" },
  { id: "brig", name: "Brig", price: 5900, hp: 455, armor: 0.08, speed: 23, regen: 2.4, color: 0x346e8f, model: "brig" },
  { id: "barque", name: "Barque", price: 6050, hp: 470, armor: 0.08, speed: 21, regen: 2.4, color: 0x7e9bc9, model: "snow" },
  { id: "corvette", name: "Corvette", price: 6650, hp: 510, armor: 0.1, speed: 25, regen: 2.4, color: 0x4c64a6, model: "frigate" },
  { id: "frigate", name: "Frigate", price: 7300, hp: 580, armor: 0.12, speed: 24, regen: 2.5, color: 0x4051a8, model: "frigate" },
  { id: "storm", name: "Sloop-of-War", price: 7800, hp: 380, armor: 0.07, speed: 31, regen: 2.0, color: 0x3556b8, model: "storm" },
  { id: "sixthrate", name: "Sixth Rate", price: 8120, hp: 535, armor: 0.1, speed: 24, regen: 2.6, color: 0x4768ad, model: "frigate" },
  { id: "galleon", name: "Galleon", price: 8500, hp: 680, armor: 0.14, speed: 12, regen: 2.9, color: 0x7e4c9d, model: "galleon" },
  { id: "rocketeer", name: "Rocketeer", price: 23500, hp: 2500, armor: 0.1, speed: 12, regen: 5.0, color: 0x9c4f35, model: "galleon" },
  { id: "merchantman", name: "Merchantman", price: 9100, hp: 760, armor: 0.12, speed: 11, regen: 3.0, color: 0xb5773c, model: "fluyt" },
  { id: "eastindiaman", name: "East Indiaman", price: 9900, hp: 820, armor: 0.15, speed: 12, regen: 3.2, color: 0xd09a42, model: "galleon" },
  { id: "postship", name: "Post Ship", price: 10350, hp: 640, armor: 0.11, speed: 22, regen: 2.8, color: 0x5d7fb2, model: "frigate" },
  { id: "carrack", name: "Carrack", price: 10800, hp: 780, armor: 0.15, speed: 10, regen: 3.1, color: 0xb84f44, model: "carrack" },
  { id: "treasure", name: "Treasure Junk", price: 36500, hp: 4000, armor: 0.14, speed: 9, regen: 5.0, color: 0xd6a83c, model: "treasure" },
  { id: "whaler", name: "Whaler", price: 10600, hp: 1750, armor: 0.1, speed: 12, regen: 2.0, color: 0x6f8792, model: "frigate" },
  { id: "razee", name: "Razee Frigate", price: 13000, hp: 850, armor: 0.16, speed: 18, regen: 3.0, color: 0x6150a3, model: "frigate" },
  { id: "ballooner", name: "Ballooner", price: 15000, hp: 1350, armor: 0, speed: 16, regen: 2.0, color: 0xbb7c43, model: "frigate" },
  { id: "turtle", name: "Turtle Ship", price: 24000, hp: 3200, armor: 0.25, speed: 8, regen: 4.0, color: 0x4f7a55, model: "turtle" },
  { id: "fourthrate", name: "Fourth Rate", price: 14600, hp: 980, armor: 0.18, speed: 12, regen: 3.4, color: 0x8e5a3f, model: "manowar" },
  { id: "grandfrigate", name: "Grand Frigate", price: 28500, hp: 1060, armor: 0.12, speed: 18, regen: 5.2, color: 0x4f78b5, model: "frigate" },
  { id: "superfrigate", name: "Super Frigate", price: 50000, hp: 3500, armor: 0.2, speed: 15, regen: 7.0, color: 0x6f86c9, model: "frigate" },
  { id: "manowar", name: "Ship of the Line", price: 16800, hp: 1120, armor: 0.2, speed: 11, regen: 3.6, color: 0xd8b24a, model: "manowar" },
  { id: "windrunner", name: "Windrunner", price: 31500, hp: 1040, armor: 0.04, speed: 28, regen: 4.2, color: 0xe0b24a, model: "clipper" },
  { id: "tidebreaker", name: "Tidebreaker", price: 50000, hp: 3200, armor: 0.1, speed: 26, regen: 7.0, color: 0x60c7d8, model: "clipper" },
  { id: "firstrate", name: "First Rate", price: 20500, hp: 1320, armor: 0.2, speed: 9, regen: 4.0, color: 0xc9b05a, model: "manowar" },
  { id: "manofwar", name: "Man o' War", price: 50000, hp: 4200, armor: 0.22, speed: 9, regen: 9.0, color: 0xd8c05a, model: "manowar" },
  { id: "treasureship", name: "Treasure Ship", price: 50000, hp: 4375, armor: 0.2, speed: 9, regen: 7.0, color: 0xe6bc48, model: "treasure" },
];
const BOT_BLOCKED_SHIP_IDS = new Set(["modernschooner", "superfrigate", "tidebreaker", "manofwar", "treasureship"]);

const shipBalance = {
  skiff: { name: "Skiff", price: 0, hp: 435, armor: 0, speed: 15, regen: 1, capacity: 4, hitbox: 2.1 },
  shallop: { name: "Shallop", price: 380, hp: 495, armor: 0, speed: 17, regen: 1, capacity: 5, hitbox: 2.25 },
  pinnace: { name: "Pinnace", price: 560, hp: 555, armor: 0, speed: 20, regen: 1, capacity: 4, hitbox: 2.35 },
  hoy: { name: "Hoy", price: 760, hp: 660, armor: 0.03, speed: 11, regen: 2, capacity: 10, hitbox: 2.9 },
  yawl: { name: "Yawl", price: 950, fixedPrice: true, hp: 585, armor: 0, speed: 18, regen: 1, capacity: 5, hitbox: 2.45, weight: 62 },
  balinger: { name: "Balinger", price: 1250, fixedPrice: true, hp: 720, armor: 0.02, speed: 14, regen: 2, capacity: 11, hitbox: 3.0, weight: 88 },
  felucca: { name: "Felucca", price: 1850, fixedPrice: true, hp: 650, armor: 0, speed: 25, regen: 1, capacity: 6, hitbox: 3.0, weight: 72 },
  bilander: { name: "Bilander", price: 2150, fixedPrice: true, hp: 840, armor: 0.04, speed: 16, regen: 2, capacity: 13, hitbox: 3.2, weight: 98 },
  cog: { name: "Cog", price: 980, hp: 780, armor: 0.05, speed: 10, regen: 2, capacity: 14, hitbox: 2.85 },
  longship: { name: "Longship", price: 1200, hp: 615, armor: 0, speed: 24, regen: 1, capacity: 6, hitbox: 3.2 },
  dogger: { name: "Dogger", price: 1320, hp: 690, armor: 0.03, speed: 18, regen: 2, capacity: 8, hitbox: 2.9 },
  dhow: { name: "Dhow", price: 1450, hp: 705, armor: 0.01, speed: 19, regen: 2, capacity: 12, hitbox: 3.0 },
  sloop: { name: "Sloop", price: 1720, hp: 675, armor: 0.02, speed: 27, regen: 1, capacity: 6, hitbox: 3.0 },
  knarr: { name: "Knarr", price: 1850, hp: 870, armor: 0.05, speed: 12, regen: 2, capacity: 16, hitbox: 3.2 },
  lugger: { name: "Lugger", price: 2050, hp: 735, armor: 0.02, speed: 22, regen: 2, capacity: 9, hitbox: 3.0 },
  tartane: { name: "Tartane", price: 2250, hp: 750, armor: 0.02, speed: 24, regen: 2, capacity: 9, hitbox: 3.1 },
  pink: { name: "Pink", price: 2500, hp: 900, armor: 0.04, speed: 15, regen: 2, capacity: 16, hitbox: 3.2 },
  cat: { name: "Catamaran", price: 2550, hp: 630, armor: 0, speed: 28, regen: 1, capacity: 5, hitbox: 3.0 },
  dart: { name: "Cutter", price: 2900, hp: 690, armor: 0.02, speed: 30, regen: 1, capacity: 5, hitbox: 3.0 },
  junk: { name: "Junk", price: 3200, hp: 990, armor: 0.06, speed: 15, regen: 3, capacity: 22, hitbox: 3.6 },
  ketch: { name: "Ketch", price: 3300, hp: 1020, armor: 0.05, speed: 16, regen: 2, capacity: 14, hitbox: 3.3 },
  schooner: { name: "Schooner", price: 3600, hp: 900, armor: 0.03, speed: 26, regen: 2, capacity: 10, hitbox: 3.3 },
  modernschooner: { name: "Modern Schooner", price: 100, fixedPrice: true, hp: 500, armor: 0, speed: 40, regen: 2, capacity: 3, hitbox: 2.55, weight: 58 },
  galley: { name: "Galley", price: 3900, hp: 930, armor: 0.02, speed: 23, regen: 2, capacity: 7, hitbox: 3.5 },
  xebec: { name: "Xebec", price: 4300, hp: 960, armor: 0.03, speed: 29, regen: 2, capacity: 8, hitbox: 3.4 },
  corsairsloop: { name: "Corsair Sloop", price: 7800, fixedPrice: true, hp: 1120, armor: 0, speed: 32, regen: 2, capacity: 10, hitbox: 3.4, weight: 105, tortugaBonusCrate: true },
  privateerbrig: { name: "Privateer Brig", price: 12800, fixedPrice: true, hp: 1750, armor: 0.03, speed: 27, regen: 3, capacity: 16, hitbox: 4.0, weight: 152, tortugaBonusCrate: true },
  raiderxebec: { name: "Raider Xebec", price: 18200, fixedPrice: true, hp: 2150, armor: 0, speed: 34, regen: 3, capacity: 14, hitbox: 4.2, weight: 148, tortugaBonusCrate: true },
  brigantine: { name: "Brigantine", price: 4850, hp: 1080, armor: 0.06, speed: 22, regen: 2, capacity: 14, hitbox: 3.8 },
  caravel: { name: "Caravel", price: 5200, hp: 1170, armor: 0.06, speed: 16, regen: 3, capacity: 18, hitbox: 3.5 },
  snow: { name: "Snow", price: 5750, hp: 1290, armor: 0.07, speed: 19, regen: 3, capacity: 18, hitbox: 3.7 },
  packet: { name: "Packet Ship", price: 6100, hp: 1050, armor: 0.03, speed: 27, regen: 2, capacity: 12, hitbox: 3.5 },
  chassemaree: { name: "Chasse-Maree", price: 6200, fixedPrice: true, hp: 1030, armor: 0.02, speed: 28, regen: 2, capacity: 13, hitbox: 3.5, weight: 108 },
  barquentine: { name: "Barquentine", price: 6750, hp: 1200, armor: 0.05, speed: 24, regen: 2, capacity: 24, hitbox: 3.7 },
  clipper: { name: "Clipper", price: 7200, hp: 1080, armor: 0.02, speed: 33, regen: 2, capacity: 18, hitbox: 3.6 },
  fluyt: { name: "Fluyt", price: 7600, hp: 1500, armor: 0.08, speed: 13, regen: 3, capacity: 34, hitbox: 4.0 },
  polacre: { name: "Polacre", price: 7850, fixedPrice: true, hp: 1320, armor: 0.04, speed: 24, regen: 2, capacity: 17, hitbox: 3.7, weight: 126 },
  storm: { name: "Sloop-of-War", price: 8500, hp: 1140, armor: 0.04, speed: 31, regen: 2, capacity: 7, hitbox: 3.4 },
  bombketch: { name: "Bomb Ketch", price: 8300, hp: 1680, armor: 0.1, speed: 10, regen: 3, capacity: 12, hitbox: 3.9 },
  brig: { name: "Brig", price: 8650, fixedPrice: true, hp: 1400, armor: 0.05, speed: 23, regen: 3, capacity: 15, hitbox: 3.8, weight: 132 },
  barque: { name: "Barque", price: 8750, hp: 1410, armor: 0.06, speed: 21, regen: 3, capacity: 28, hitbox: 3.9 },
  corvette: { name: "Corvette", price: 9400, hp: 1530, armor: 0.08, speed: 25, regen: 3, capacity: 14, hitbox: 3.9 },
  sixthrate: { name: "Sixth Rate", price: 9900, fixedPrice: true, hp: 1600, armor: 0.08, speed: 24, regen: 3, capacity: 15, hitbox: 4.0, weight: 145 },
  frigate: { name: "Frigate", price: 10500, hp: 1740, armor: 0.1, speed: 24, regen: 3, capacity: 16, hitbox: 4.1 },
  postship: { name: "Post Ship", price: 11200, fixedPrice: true, hp: 1880, armor: 0.09, speed: 22, regen: 3, capacity: 18, hitbox: 4.2, weight: 162 },
  merchantman: { name: "Merchantman", price: 11600, hp: 2280, armor: 0.1, speed: 11, regen: 4, capacity: 42, hitbox: 4.4 },
  carrack: { name: "Carrack", price: 12600, hp: 2340, armor: 0.11, speed: 10, regen: 4, capacity: 30, hitbox: 4.4 },
  galleon: { name: "Galleon", price: 14200, hp: 2700, armor: 0.14, speed: 12, regen: 5, capacity: 38, hitbox: 4.6 },
  rocketeer: { name: "Rocketeer", price: 23500, fixedPrice: true, hp: 2500, armor: 0.1, speed: 12, regen: 5, capacity: 38, hitbox: 4.6, weight: 206 },
  eastindiaman: { name: "East Indiaman", price: 15600, hp: 2460, armor: 0.13, speed: 12, regen: 4, capacity: 52, hitbox: 4.7 },
  treasure: { name: "Treasure Junk", price: 36500, fixedPrice: true, hp: 4000, armor: 0.12, speed: 9, regen: 5, capacity: 56, hitbox: 6.1, weight: 320 },
  whaler: { name: "Whaler", price: 10600, fixedPrice: true, hp: 1750, armor: 0.1, speed: 12, regen: 2, capacity: 4, blubberCapacity: 50, hitbox: 4.6, weight: 205, ramTakenScale: 0.5, whaleRamTakenScale: 0.25 },
  razee: { name: "Razee Frigate", price: 17000, hp: 2550, armor: 0.14, speed: 18, regen: 4, capacity: 20, hitbox: 4.6 },
  ballooner: { name: "Ballooner", price: 15000, fixedPrice: true, hp: 1350, armor: 0, speed: 16, regen: 2, capacity: 10, hitbox: 4.1, weight: 160 },
  turtle: { name: "Turtle Ship", price: 24000, fixedPrice: true, hp: 3200, armor: 0.25, speed: 8, regen: 4, capacity: 18, hitbox: 4.9, weight: 255 },
  fourthrate: { name: "Fourth Rate", price: 22000, hp: 2940, armor: 0.17, speed: 12, regen: 5, capacity: 22, hitbox: 4.9 },
  grandfrigate: { name: "Grand Frigate", price: 28500, fixedPrice: true, hp: 3150, armor: 0.12, speed: 18, regen: 6, capacity: 24, hitbox: 5.0, weight: 255 },
  superfrigate: { name: "Super Frigate", price: 50000, fixedPrice: true, hp: 3500, armor: 0.2, speed: 15, regen: 7, capacity: 25, hitbox: 5.5, weight: 292 },
  manowar: { name: "Ship of the Line", price: 26500, hp: 3360, armor: 0.19, speed: 11, regen: 6, capacity: 24, hitbox: 5.2 },
  windrunner: { name: "Windrunner", price: 31500, fixedPrice: true, hp: 3000, armor: 0, speed: 28, regen: 5, capacity: 18, hitbox: 4.8, weight: 210 },
  tidebreaker: { name: "Tidebreaker", price: 50000, fixedPrice: true, hp: 3200, armor: 0.1, speed: 26, regen: 7, capacity: 20, hitbox: 5.8, weight: 255 },
  firstrate: { name: "First Rate", price: 33500, hp: 3960, armor: 0.2, speed: 9, regen: 8, capacity: 26, hitbox: 5.6 },
  manofwar: { name: "Man o' War", price: 50000, fixedPrice: true, hp: 4200, armor: 0.22, speed: 9, regen: 9, capacity: 26, hitbox: 6.6, weight: 345 },
  treasureship: { name: "Treasure Ship", price: 50000, fixedPrice: true, hp: 4375, armor: 0.2, speed: 9, regen: 7, capacity: 64, hitbox: 7.0, weight: 390 },
};

const SHIP_SIDE_CANNONS = {
  skiff: 1, shallop: 1, pinnace: 1, yawl: 1, felucca: 1, cat: 1, dart: 1, sloop: 1, longship: 1,
  hoy: 2, balinger: 2, bilander: 2, cog: 2, dogger: 2, dhow: 2, knarr: 2, lugger: 2, tartane: 2,
  pink: 2, junk: 2, ketch: 2, schooner: 2, modernschooner: 1, galley: 2, xebec: 2, corsairsloop: 3,
  brigantine: 3, caravel: 3, snow: 3, packet: 3, chassemaree: 3, barquentine: 3, clipper: 3,
  fluyt: 3, polacre: 3, bombketch: 3, brig: 3, privateerbrig: 4, raiderxebec: 4, barque: 3, storm: 3, corvette: 3, whaler: 3,
  ballooner: 3, turtle: 5, frigate: 4, postship: 4, sixthrate: 4, carrack: 4, merchantman: 5,
  eastindiaman: 5, galleon: 5, rocketeer: 5, razee: 5, treasure: 7, fourthrate: 6,
  grandfrigate: 7, superfrigate: 9, windrunner: 6, tidebreaker: 8, firstrate: 8, manowar: 7, manofwar: 10, treasureship: 9,
};

const SHIP_VISUAL_BASE_SCALE = {
  skiff: 0.72, shallop: 0.78, pinnace: 0.8, yawl: 0.82, balinger: 0.88, felucca: 0.88,
  bilander: 0.92, dart: 0.82, cat: 0.86, longship: 0.86, cog: 0.86, knarr: 0.88,
  dhow: 0.88, dogger: 0.88, sloop: 0.9, modernschooner: 0.86, lugger: 0.9, tartane: 0.9,
  storm: 0.92, corsairsloop: 1.02, brig: 1.12, privateerbrig: 1.18, raiderxebec: 1.2, brigantine: 1.18, packet: 1.05, barquentine: 1.12,
  barque: 1.15, bombketch: 1.22, turtle: 1.22, corvette: 1.16, frigate: 1.22,
  whaler: 1.36, ballooner: 1.18, razee: 1.28, grandfrigate: 1.38, superfrigate: 1.535, windrunner: 1.34, tidebreaker: 1.608,
  galleon: 1.28, rocketeer: 1.28, merchantman: 1.28, eastindiaman: 1.34, carrack: 1.34,
  treasure: 1.52, treasureship: 1.748, fourthrate: 1.38, manowar: 1.42, firstrate: 1.5, manofwar: 1.7625, ironclad: 1.48,
};

const DEFAULT_SHIP_HULL_DIMENSIONS = [6.5, 2.7];
const SHIP_HULL_DIMENSIONS = {
  shallop: [5.6, 1.85], pinnace: [6.5, 1.75], yawl: [6.0, 1.85], balinger: [6.4, 2.7],
  felucca: [7.4, 1.95], bilander: [6.8, 2.55], dart: [7.7, 1.75], clipper: [7.4, 2.35],
  galleon: [7.2, 3.25], rocketeer: [7.2, 3.25], modernschooner: [6.4, 1.85],
  corsairsloop: [8.2, 2.2], privateerbrig: [8.0, 2.8], raiderxebec: [9.0, 2.45],
  brig: [7.8, 2.72], brigantine: [7.2, 2.75], cat: [5.8, 1.45], turtle: [6.2, 3.55],
  bombketch: [6.4, 3.4], storm: [8.1, 2.25], sloop: [7.4, 2.0], dhow: [7.1, 2.25],
  cog: [6.2, 3.05], hoy: [5.9, 2.85], dogger: [6.6, 2.2], xebec: [8.3, 2.4],
  tartane: [7.2, 2.15], caravel: [6.9, 2.65], pink: [6.6, 2.55], ketch: [6.9, 2.5],
  frigate: [8.2, 2.9], whaler: [8.3, 3.05], ballooner: [8.0, 3.05], corvette: [7.8, 2.65],
  razee: [8.5, 3.0], grandfrigate: [8.9, 3.18], superfrigate: [9.6, 3.55], windrunner: [9.4, 2.55], tidebreaker: [9.4, 2.75], carrack: [7.4, 3.5],
  manowar: [8.4, 3.8], fourthrate: [8.3, 3.65], firstrate: [9.0, 4.0], manofwar: [9.0, 4.08], longship: [8.7, 1.7],
  knarr: [6.5, 2.6], lugger: [7.0, 2.15], galley: [8.8, 2.2], snow: [7.5, 2.8],
  packet: [7.8, 2.45], chassemaree: [7.6, 2.25], barquentine: [7.7, 2.55],
  polacre: [7.9, 2.45], barque: [8.0, 2.8], fluyt: [7.0, 3.4], merchantman: [7.4, 3.45],
  eastindiaman: [7.8, 3.55], treasure: [12.0, 4.45], treasureship: [12.0, 4.75], ironclad: [7.8, 3.7],
};

const shipVisualScaleCache = new Map();
const shipHullDimensionCache = new Map();
const shipHullFootprintCache = new Map();

const shipLookup = {
  byId: new Map(),
  byCompact: new Map(),
};

function compactShipKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function rebuildShipLookupMaps() {
  shipLookup.byId.clear();
  shipLookup.byCompact.clear();
  for (const ship of shipCatalog) {
    shipLookup.byId.set(ship.id, ship);
    shipLookup.byCompact.set(compactShipKey(ship.id), ship);
    shipLookup.byCompact.set(compactShipKey(ship.name), ship);
  }
}

rebuildShipLookupMaps();

Object.assign(I18N.en.ships, Object.fromEntries(shipCatalog.map((ship) => [ship.id, ship.name])));
Object.assign(I18N.zh.ships, {
  skiff: "小艇", shallop: "浅水帆船", pinnace: "小型快艇", hoy: "霍伊船", yawl: "偏帆小船", balinger: "巴林杰帆船", felucca: "费卢卡帆船", bilander: "双桅小商船", cog: "柯克船", longship: "长船", dogger: "多格尔渔船", dhow: "独桅三角帆船", sloop: "单桅帆船", knarr: "克纳尔货船", lugger: "斜桅小帆船", tartane: "塔尔塔纳帆船", pink: "平克帆船", cat: "双体帆船", dart: "快艇", junk: "中式帆船", ketch: "双桅帆船", schooner: "纵帆船", galley: "桨帆船", xebec: "三桅小帆船", brigantine: "双桅纵帆船", caravel: "卡拉维尔帆船", snow: "斯诺双桅船", packet: "邮船", barquentine: "巴肯廷帆船", clipper: "飞剪船", fluyt: "荷兰货船", bombketch: "臼炮双桅船", barque: "三桅帆船", corvette: "轻型护卫舰", frigate: "护卫舰", storm: "战争单桅船", galleon: "盖伦船", merchantman: "武装商船", eastindiaman: "东印度商船", carrack: "卡拉克帆船", treasure: "宝船", whaler: "捕鲸船", razee: "削层护卫舰", ballooner: "气球船", fourthrate: "四级战列舰", grandfrigate: "大型护卫舰", manowar: "战列舰", windrunner: "逐风船", firstrate: "一级战列舰",
});
Object.assign(I18N.fr.ships, {
  skiff: "Esquif", shallop: "Chaloupe", pinnace: "Pinasse", hoy: "Hoy", yawl: "Yawl", balinger: "Balinger", felucca: "Feluque", bilander: "Bilander", cog: "Cogue", longship: "Drakkar", dogger: "Dogre", dhow: "Dhow", sloop: "Sloop", knarr: "Knarr", lugger: "Lougre", tartane: "Tartane", pink: "Pinque", cat: "Catamaran", dart: "Cotre", junk: "Jonque", ketch: "Ketch", schooner: "Goélette", galley: "Galère", xebec: "Chebec", brigantine: "Brigantin", caravel: "Caravelle", snow: "Senau", packet: "Paquebot", barquentine: "Barquentine", clipper: "Clipper", fluyt: "Flûte", bombketch: "Ketch à bombes", barque: "Barque", corvette: "Corvette", frigate: "Frégate", storm: "Sloop de guerre", galleon: "Galion", merchantman: "Navire marchand", eastindiaman: "Indiaman", carrack: "Caraque", treasure: "Jonque au trésor", whaler: "Baleinier", razee: "Frégate rasée", ballooner: "Ballooner", fourthrate: "Quatrième rang", grandfrigate: "Grande frégate", manowar: "Vaisseau de ligne", windrunner: "Coureur des vents", firstrate: "Premier rang",
});
Object.assign(I18N.de.ships, {
  skiff: "Skiff", shallop: "Schaluppe", pinnace: "Pinasse", hoy: "Hoy", yawl: "Yawl", balinger: "Balinger", felucca: "Feluke", bilander: "Bilander", cog: "Kogge", longship: "Langschiff", dogger: "Dogger", dhow: "Dhau", sloop: "Sloop", knarr: "Knarr", lugger: "Lugger", tartane: "Tartane", pink: "Pink", cat: "Katamaran", dart: "Kutter", junk: "Dschunke", ketch: "Ketsch", schooner: "Schoner", galley: "Galeere", xebec: "Schebecke", brigantine: "Brigantine", caravel: "Karavelle", snow: "Snow", packet: "Paketschiff", barquentine: "Barkentine", clipper: "Klipper", fluyt: "Fleute", bombketch: "Bombenketsch", barque: "Bark", corvette: "Korvette", frigate: "Fregatte", storm: "Kriegssloop", galleon: "Galeone", merchantman: "Handelsschiff", eastindiaman: "Ostindienfahrer", carrack: "Karacke", treasure: "Schatzdschunke", whaler: "Walfänger", razee: "Razee-Fregatte", ballooner: "Ballooner", fourthrate: "Vierter Rang", grandfrigate: "Große Fregatte", manowar: "Linienschiff", windrunner: "Windläufer", firstrate: "Erster Rang",
});
Object.assign(I18N.es.ships, {
  skiff: "Esquife", shallop: "Chalupa", pinnace: "Pinaza", hoy: "Hoy", yawl: "Yola", balinger: "Balinger", felucca: "Faluca", bilander: "Bilander", cog: "Coca", longship: "Drakkar", dogger: "Dogger", dhow: "Dhow", sloop: "Balandra", knarr: "Knarr", lugger: "Lugre", tartane: "Tartana", pink: "Pinque", cat: "Catamarán", dart: "Cúter", junk: "Junco", ketch: "Queche", schooner: "Goleta", galley: "Galera", xebec: "Jabeque", brigantine: "Bergantín-goleta", caravel: "Carabela", snow: "Bergantín snow", packet: "Paquebote", barquentine: "Barquentina", clipper: "Clipper", fluyt: "Filibote", bombketch: "Queche bombardero", barque: "Barca", corvette: "Corbeta", frigate: "Fragata", storm: "Balandra de guerra", galleon: "Galeón", merchantman: "Mercante", eastindiaman: "Indiaman", carrack: "Carraca", treasure: "Junco del tesoro", whaler: "Ballenero", razee: "Fragata razee", ballooner: "Ballooner", fourthrate: "Cuarta clase", grandfrigate: "Gran fragata", manowar: "Navío de línea", windrunner: "Correvientos", firstrate: "Primera clase",
});

Object.assign(I18N.fr.ui, {
  toastStopShip: "Arrete ton navire avant de marcher.", toastDeckView: "Vue pont. Appuie sur C pour reprendre la navigation.", toastReturnedDeck: "Retour sur le pont.", toastSailingControls: "Commandes de navigation restaurees.", toastAmmoSlotEmpty: "Cet emplacement est vide.", toastPutShotHotbar: "Place d'abord cette munition dans la barre.", toastBasicSlot: "Le boulet basique reste en emplacement 1.", toastWindShown: "Marqueurs de vent affiches.", toastWindHidden: "Marqueurs de vent masques.", toastGetCloser: "Approche-toi d'une ile pour accoster.", toastLineRetracted: "Ligne rentree.", toastWhalerOnly: "Seul le baleinier peut utiliser les filets lateraux.", toastNetsOut: "Filets du baleinier sortis. Vitesse reduite.", toastNetsIn: "Filets du baleinier rentres.", toastDockCancel: "Accostage annule. Reste pres de l'ile.", toastSailsRaised: "Voiles hissees.", toastDockBeforeShop: "Accoste a une ile avant d'acheter.", toastHoldFull: "Ta cale est pleine.", toastBlubberFull: "La cale a graisse est pleine.", toastRecoveredBlubber: "Graisse de baleine recuperee.", toastSpyShip: "Utilise la longue-vue depuis ton navire.", toastSpyNone: "Aucun navire trouve. Vise une voile.", toastNotEnoughGold: "Pas assez d'or.", toastNoCargoSell: "Aucune cargaison a vendre.", toastBalloonMax: "Tu as deja le maximum de ballons.", toastBalloonBought: "Montgolfiere achetee.", toastNeedPoints: "Monte de niveau pour gagner des points.", toastReloadMax: "Amelioration de rechargement au maximum.", toastUpgradeInstalled: "Amelioration installee.", toastBalloonerOnly: "Seul un Ballooner peut lancer des montgolfieres.", toastThreeBalloons: "Seulement 3 ballons peuvent etre lances a la fois.", toastNoBalloons: "Aucune montgolfiere de rechange.", toastBalloonLaunched: "Ballon lance. Appuie sur V pour changer de vue.", toastShipView: "Vue navire.", toastBalloonView: "Vue ballon.", toastNextBalloon: "Vue du ballon suivant.", toastBalloonDescending: "Ballon en descente. Garde-le au-dessus du Ballooner.", toastBombUsed: "Ce ballon a deja largue sa bombe.", toastBombAway: "Bombe larguee.", toastBalloonRecovered: "Ballon recupere.", toastBalloonSplash: "Ballon tombe a l'eau.", toastWaterfall: "Tu as franchi la cascade du bord du monde.", toastJumpWater: "Tu as saute a l'eau. Appuie sur F pour revenir au navire.", toastSwimming: "Tu nages. Appuie sur F pour revenir au navire.", toastGoldDiggerBlock: "Teleportation GoldDigger bloquee par l'ile.", toastGoldDiggerMinimap: "Teleportation GoldDigger via la mini-carte.", toastConnected: "Connecte aux eaux multijoueurs.", toastReconnected: "Reconnecte aux eaux multijoueurs.", toastDisconnected: "Multijoueur deconnecte. Reconnexion..."
});
Object.assign(I18N.de.ui, {
  toastStopShip: "Halte dein Schiff an, bevor du herumlaeufst.", toastDeckView: "Deckansicht. Druecke C fuer Segelsteuerung.", toastReturnedDeck: "Zurueck an Deck.", toastSailingControls: "Segelsteuerung wiederhergestellt.", toastAmmoSlotEmpty: "Dieser Munitionsplatz ist leer.", toastPutShotHotbar: "Lege diese Munition zuerst in die Leiste.", toastBasicSlot: "Basis-Kugel bleibt auf Platz 1.", toastWindShown: "Windmarkierungen angezeigt.", toastWindHidden: "Windmarkierungen ausgeblendet.", toastGetCloser: "Fahre naeher an eine Insel zum Anlegen.", toastLineRetracted: "Leine eingeholt.", toastWhalerOnly: "Nur der Walfaenger kann Seitennetze nutzen.", toastNetsOut: "Walfaenger-Netze ausgefahren. Tempo reduziert.", toastNetsIn: "Walfaenger-Netze eingefahren.", toastDockCancel: "Anlegen abgebrochen. Bleib nahe an der Insel.", toastSailsRaised: "Segel gesetzt.", toastDockBeforeShop: "Lege an einer Insel an, bevor du einkaufst.", toastHoldFull: "Dein Laderaum ist voll.", toastBlubberFull: "Dein Waltran-Laderaum ist voll.", toastRecoveredBlubber: "Waltran geborgen.", toastSpyShip: "Benutze das Fernrohr von deinem Schiff aus.", toastSpyNone: "Kein Schiff gefunden. Ziele auf ein Segel.", toastNotEnoughGold: "Nicht genug Gold.", toastNoCargoSell: "Keine Ladung zum Verkaufen.", toastBalloonMax: "Du hast bereits die maximale Ballonzahl.", toastBalloonBought: "Heissluftballon gekauft.", toastNeedPoints: "Steige auf, um Upgradepunkte zu erhalten.", toastReloadMax: "Nachlade-Upgrade ist maximal.", toastUpgradeInstalled: "Upgrade installiert.", toastBalloonerOnly: "Nur ein Ballooner kann Heissluftballons starten.", toastThreeBalloons: "Nur 3 Ballons koennen gleichzeitig starten.", toastNoBalloons: "Keine Ersatzballons.", toastBalloonLaunched: "Ballon gestartet. Druecke V zum Wechseln.", toastShipView: "Schiffsansicht.", toastBalloonView: "Ballonansicht.", toastNextBalloon: "Naechste Ballonansicht.", toastBalloonDescending: "Ballon sinkt. Halte ihn ueber dem Ballooner.", toastBombUsed: "Dieser Ballon hat seine Bombe schon abgeworfen.", toastBombAway: "Bombe abgeworfen.", toastBalloonRecovered: "Ballon geborgen.", toastBalloonSplash: "Ballon ins Wasser gefallen.", toastWaterfall: "Du hast den Wasserfall am Rand der Welt ueberquert.", toastJumpWater: "Du bist ins Wasser gesprungen. Druecke F, um zurueckzukehren.", toastSwimming: "Du schwimmst. Druecke F, um zum Schiff zurueckzukehren.", toastGoldDiggerBlock: "GoldDigger-Teleport von Insel blockiert.", toastGoldDiggerMinimap: "GoldDigger-Minimap-Teleport.", toastConnected: "Mit Mehrspieler-Gewaessern verbunden.", toastReconnected: "Wieder mit Mehrspieler-Gewaessern verbunden.", toastDisconnected: "Mehrspieler getrennt. Neuverbindung..."
});
Object.assign(I18N.es.ui, {
  toastStopShip: "Deten tu barco antes de caminar.", toastDeckView: "Vista de cubierta. Pulsa C para controles de navegacion.", toastReturnedDeck: "Volviste a cubierta.", toastSailingControls: "Controles de navegacion restaurados.", toastAmmoSlotEmpty: "Esa ranura esta vacia.", toastPutShotHotbar: "Pon esa municion en la barra primero.", toastBasicSlot: "La bala basica se queda en la ranura 1.", toastWindShown: "Marcadores de viento mostrados.", toastWindHidden: "Marcadores de viento ocultos.", toastGetCloser: "Acercate a una isla para atracar.", toastLineRetracted: "Sedal recogido.", toastWhalerOnly: "Solo el ballenero puede usar redes laterales.", toastNetsOut: "Redes del ballenero extendidas. Velocidad reducida.", toastNetsIn: "Redes del ballenero recogidas.", toastDockCancel: "Atracado cancelado. Quedate cerca de la isla.", toastSailsRaised: "Velas izadas.", toastDockBeforeShop: "Atraca en una isla antes de comprar.", toastHoldFull: "Tu bodega esta llena.", toastBlubberFull: "Tu bodega de grasa esta llena.", toastRecoveredBlubber: "Grasa de ballena recuperada.", toastSpyShip: "Usa el catalejo desde tu barco.", toastSpyNone: "El catalejo no encontro barcos. Apunta a una vela.", toastNotEnoughGold: "No tienes suficiente oro.", toastNoCargoSell: "No hay carga para vender.", toastBalloonMax: "Ya tienes el maximo de globos.", toastBalloonBought: "Globo aerostatico comprado.", toastNeedPoints: "Sube de nivel para ganar puntos.", toastReloadMax: "Mejora de recarga al maximo.", toastUpgradeInstalled: "Mejora instalada.", toastBalloonerOnly: "Solo un Ballooner puede lanzar globos.", toastThreeBalloons: "Solo se pueden lanzar 3 globos a la vez.", toastNoBalloons: "No hay globos de repuesto.", toastBalloonLaunched: "Globo lanzado. Pulsa V para cambiar vista.", toastShipView: "Vista de barco.", toastBalloonView: "Vista de globo.", toastNextBalloon: "Siguiente vista de globo.", toastBalloonDescending: "Globo descendiendo. Mantenlo sobre el Ballooner.", toastBombUsed: "Este globo ya lanzo su bomba.", toastBombAway: "Bomba lanzada.", toastBalloonRecovered: "Globo recuperado.", toastBalloonSplash: "Globo cayo al agua.", toastWaterfall: "Cruzaste la cascada del borde del mundo.", toastJumpWater: "Saltaste al agua. Pulsa F para volver al barco.", toastSwimming: "Estas nadando. Pulsa F para volver al barco.", toastGoldDiggerBlock: "Teletransporte GoldDigger bloqueado por isla.", toastGoldDiggerMinimap: "Teletransporte GoldDigger en minimapa.", toastConnected: "Conectado a aguas multijugador.", toastReconnected: "Reconectado a aguas multijugador.", toastDisconnected: "Multijugador desconectado. Reconectando..."
});

function armorCapForSpeed(speed) {
  if (speed > 22) return 0;
  if (speed >= 20) return 0.04;
  if (speed >= 17) return 0.08;
  if (speed >= 14) return 0.13;
  return 0.2;
}

function deriveShipWeight(ship) {
  const hullMass = (ship.hitbox || 3) ** 2 * 8;
  const structureMass = (ship.hp || 500) / 150;
  const cargoMass = (ship.capacity || 8) * 0.5;
  const speedTrim = (ship.speed || 15) * 0.05;
  return Math.round(clamp(hullMass + structureMass + cargoMass - speedTrim, 35, 320));
}

function broadsidePriceFloor(ship) {
  const cannons = shipSideCannons(ship.id);
  const floors = [0, 0, 2800, 7600, 11200, 16500, 22000, 28000, 35200, 44500];
  return floors[cannons] || 0;
}

function deriveFairShipPrice(ship) {
  if (ship.id === STARTER_SHIP) return 0;
  const cannons = shipSideCannons(ship.id);
  const broadsideValue = Math.max(0, cannons - 1) * 900
    + Math.max(0, cannons - 3) * 650
    + Math.max(0, cannons - 5) * 1000;
  const value = ship.hp * 2.2
    + ship.speed * 95
    + ship.regen * 260
    + ship.capacity * 65
    + ship.armor * 8500
    + ship.hitbox * 260
    + broadsideValue;
  const sizePremium = 1 + Math.max(0, (ship.hitbox || 3) - 3) * 0.18;
  const blended = ship.price * 0.55 + value * sizePremium * 0.45;
  return Math.max(ship.price, broadsidePriceFloor(ship), Math.round(blended / 50) * 50);
}

function keepExactShipPrice(shipId) {
  return ["whaler", "ballooner", "windrunner", "tidebreaker", "turtle", "rocketeer", "superfrigate", "manofwar", "treasureship", "modernschooner", "corsairsloop", "privateerbrig", "raiderxebec"].includes(shipId);
}

for (const ship of shipCatalog) {
  const balance = shipBalance[ship.id];
  if (!balance) continue;
  Object.assign(ship, balance);
  ship.armor = ship.id === "turtle"
    ? 0.25
    : ship.id === "manofwar"
      ? 0.22
      : clamp(Math.min(ship.armor, armorCapForSpeed(ship.speed)), 0, 0.2);
  ship.regen = ship.id === "manofwar"
    ? 9
    : Math.round(clamp(ship.regen, 1, 8));
  ship.price = balance.fixedPrice && keepExactShipPrice(ship.id)
    ? Math.max(balance.price, broadsidePriceFloor(ship))
    : deriveFairShipPrice(ship);
  if (ship.price < 2500 && !balance.fixedPrice) {
    const progress = clamp(ship.price / 2500, 0, 1);
    ship.hp = Math.min(ship.hp, Math.round(420 + progress * 380));
    ship.speed = Math.min(ship.speed, Math.round(15 + progress * 9));
    ship.regen = Math.min(ship.regen, ship.price < 1200 ? 1 : 2);
    ship.capacity = Math.min(ship.capacity || 8, Math.round(5 + progress * 9));
    ship.armor = Math.min(ship.armor, progress > 0.75 ? 0.04 : 0.02);
  }
  const tierScale = 1 + Math.max(0, shipTier(ship.id) - 2) * 0.045;
  ship.hitbox = Math.round((ship.hitbox || 3) * tierScale * 10) / 10;
  ship.weight = Math.round((balance.weight ?? deriveShipWeight(ship)) * tierScale * tierScale);
}
rebuildShipLookupMaps();

function readSavedValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Joining the game should still work if browser storage is blocked.
  }
}

function normalizeLanguage(value) {
  return I18N[value] ? value : DEFAULT_LANGUAGE;
}

function normalizeGraphicsQuality(value) {
  return GRAPHICS_OPTIONS[value] ? value : DEFAULT_GRAPHICS_QUALITY;
}

const captainId = readSavedValue("islandwakeId") || crypto.randomUUID();
saveValue("islandwakeId", captainId);
const fallbackCaptainNumber = 100 + Array.from(captainId).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 900, 0);
const playerId = crypto.randomUUID();
const state = {
  name: "",
  autoGeneratedName: false,
  language: normalizeLanguage(readSavedValue("islandwakeLanguage", DEFAULT_LANGUAGE)),
  graphicsQuality: DEFAULT_GRAPHICS_QUALITY,
  devToken: "",
  accountName: readSavedValue("islandwakeAccount"),
  accountPassword: "",
  accountMode: "",
  googleAccount: null,
  accountAuthed: false,
  infiniteGold: false,
  infiniteLevels: false,
  joined: false,
  guideAsked: false,
  modernSchoonerRolled: false,
  modernSchoonerAvailable: false,
  modernSchoonerPurchased: false,
  level: 1,
  xp: 0,
  gold: 240,
  points: 0,
  mode: "ship",
  tool: "cannon",
  dockedAt: null,
  shopTab: "goods",
  shipType: STARTER_SHIP,
  hp: shipBalance[STARTER_SHIP].hp,
  cargo: {},
  upgrades: { damage: 0, fireRate: 0, range: 0 },
  ammo: { grapeshot: 0, hotshot: 0, harpoon: 0, airburst: 0, rocketburst: 0 },
  ammoSlots: [...AMMO_SLOT_TYPES],
  selectedAmmo: "basic",
  selectedAmmoSlot: 0,
  pendingAmmoAssign: null,
  inventory: Object.fromEntries(BUILD_ITEM_ORDER.map((id) => [id, 0])),
  items: { cursedCompass: false },
  cursedCompassOwner: null,
  selectedBuildItem: null,
  inventoryOpen: false,
  forgeOpen: false,
  forgeWaterfallTransit: null,
  buildSnap: true,
  buildRotationOffset: 0,
  docking: null,
  fallingOffWorld: false,
  fallingTimer: 0,
  fallVelocityY: 0,
  fallDrift: new THREE.Vector3(),
  fallSpin: new THREE.Vector3(),
  viewMode: "ship",
  activeBalloonIndex: -1,
  balloonStock: 0,
  maxBalloons: 5,
  whalerNets: false,
  whalerNetProgress: 0,
  turtleFire: false,
  turtleFireTimer: 0,
  turtleFireCooldown: 0,
  turtleFireUntil: 0,
  turtleFireCooldownUntil: 0,
  rocketBurst: null,
  rocketCooldown: 0,
  rocketCooldownUntil: 0,
  characterHp: CHARACTER_MAX_HP,
  swimHp: CHARACTER_MAX_HP,
  showWindMarkers: readSavedValue("islandwakeWindMarkers") === "1",
  fire: null,
  cooldown: 0,
  cooldownUntil: 0,
  rodCooldown: 0,
  rodCooldownUntil: 0,
  position: new THREE.Vector3(-15, 0, -12),
  velocity: new THREE.Vector3(),
  rotation: 0,
  shipBank: 0,
  walkingPos: new THREE.Vector3(),
  walkHeight: 0,
  walkVelocityY: 0,
  grounded: true,
  leviathanGrabbed: false,
  cameraYaw: 0,
  cameraPitch: 0.28,
  fishing: null,
  spyTarget: null,
};

const TOAST_EXACT_KEYS = {
  "Stop your ship before walking around.": "toastStopShip",
  "Deck view. Press C for sailing controls.": "toastDeckView",
  "Returned to the deck.": "toastReturnedDeck",
  "Sailing controls restored.": "toastSailingControls",
  "That ammo slot is empty.": "toastAmmoSlotEmpty",
  "Put that shot in a hotbar slot first.": "toastPutShotHotbar",
  "Basic Shell stays in slot 1.": "toastBasicSlot",
  "Wind markers shown.": "toastWindShown",
  "Wind markers hidden.": "toastWindHidden",
  "Get closer to an island to dock.": "toastGetCloser",
  "Line retracted.": "toastLineRetracted",
  "Only the Whaler can use side nets at sea.": "toastWhalerOnly",
  "Whaler nets extended. Speed reduced.": "toastNetsOut",
  "Whaler nets retracted.": "toastNetsIn",
  "Docking cancelled. Stay close to the island.": "toastDockCancel",
  "Sails raised.": "toastSailsRaised",
  "Dock at an island before shopping.": "toastDockBeforeShop",
  "Your hold is full.": "toastHoldFull",
  "Your blubber hold is full.": "toastBlubberFull",
  "Recovered whale blubber.": "toastRecoveredBlubber",
  "Use the spyglass from your ship.": "toastSpyShip",
  "Spyglass found no ships. Aim toward a sail.": "toastSpyNone",
  "Not enough gold.": "toastNotEnoughGold",
  "No cargo to sell.": "toastNoCargoSell",
  "You already have the maximum number of balloons.": "toastBalloonMax",
  "Hot air balloon purchased.": "toastBalloonBought",
  "Level up to earn upgrade points.": "toastNeedPoints",
  "Reload upgrade is maxed.": "toastReloadMax",
  "Upgrade installed.": "toastUpgradeInstalled",
  "Only a Ballooner can launch hot air balloons.": "toastBalloonerOnly",
  "Only 3 balloons can be launched at once.": "toastThreeBalloons",
  "No spare hot air balloons.": "toastNoBalloons",
  "Balloon launched. Press V to switch view.": "toastBalloonLaunched",
  "Ship view.": "toastShipView",
  "Balloon view.": "toastBalloonView",
  "Next balloon view.": "toastNextBalloon",
  "Balloon descending. Keep it above the Ballooner.": "toastBalloonDescending",
  "This balloon has already dropped its bomb.": "toastBombUsed",
  "Bomb away.": "toastBombAway",
  "Balloon recovered.": "toastBalloonRecovered",
  "Balloon splashed down.": "toastBalloonSplash",
  "You crossed the waterfall at the edge of the world.": "toastWaterfall",
  "You jumped into the water. Press F to return to your ship.": "toastJumpWater",
  "You are swimming. Press F to return to your ship.": "toastSwimming",
  "GoldDigger teleport blocked: island.": "toastGoldDiggerBlock",
  "GoldDigger minimap teleport.": "toastGoldDiggerMinimap",
  "Connected to multiplayer waters.": "toastConnected",
  "Reconnected to multiplayer waters.": "toastReconnected",
  "Multiplayer disconnected. Reconnecting...": "toastDisconnected",
};

function playSound() {}

function formatText(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function t(key, values = {}) {
  const current = I18N[state.language]?.ui?.[key];
  const fallback = I18N.en.ui[key] || key;
  return formatText(current || fallback, values);
}

function localize(group, key, fallback = key) {
  return I18N[state.language]?.[group]?.[key] || I18N.en[group]?.[key] || fallback;
}

function shipName(shipOrType) {
  const ship = typeof shipOrType === "object" ? shipOrType : getShipStats(shipOrType);
  return localize("ships", ship.id, ship.name || ship.id);
}

function goodName(name) {
  return localize("goods", name, name);
}

const islandClaimNames = new Map();

function shouldShowIslandLabel(islandOrName) {
  const name = typeof islandOrName === "object" ? islandOrName?.name : islandOrName;
  if (!name) return false;
  const island = typeof islandOrName === "object"
    ? islandOrName
    : typeof islandData !== "undefined"
      ? islandData.find((item) => item.name === name)
      : null;
  if (island?.hiddenLabel || island?.noMinimap) return false;
  return !island?.unnamed || islandClaimNames.has(name);
}

function islandName(islandOrName) {
  const name = typeof islandOrName === "object" ? islandOrName?.name : islandOrName;
  if (name && islandClaimNames.has(name)) return islandClaimNames.get(name).name;
  const island = typeof islandOrName === "object"
    ? islandOrName
    : typeof islandData !== "undefined"
      ? islandData.find((item) => item.name === name)
      : null;
  if (island?.unnamed) return t("unclaimedIsland");
  return localize("islands", name, name);
}

function cultureName(culture) {
  return localize("cultures", culture, culture);
}

function ammoName(ammoOrType) {
  const id = typeof ammoOrType === "object" ? ammoOrType.id : ammoOrType;
  const ammo = CANNONBALL_TYPES[id] || CANNONBALL_TYPES.basic;
  return localize("ammo", id, ammo.name);
}

function ammoShortName(ammoOrType) {
  const id = typeof ammoOrType === "object" ? ammoOrType.id : ammoOrType;
  const ammo = CANNONBALL_TYPES[id] || CANNONBALL_TYPES.basic;
  return localize("ammoShort", id, ammo.short);
}

function entityName(name) {
  return localize("entities", name, name);
}

function translateLooseName(value) {
  const text = String(value || "");
  const ship = shipCatalog.find((item) => item.name === text || item.id === text);
  if (ship) return shipName(ship);
  if (goods.includes(text) || text === "Whale Blubber") return goodName(text);
  const ammo = Object.values(CANNONBALL_TYPES).find((item) => item.name === text || item.id === text);
  if (ammo) return ammoName(ammo);
  if (I18N.en.entities[text]) return entityName(text);
  if (I18N.en.islands[text]) return islandName(text);
  return text;
}

function translateMessage(message) {
  const text = String(message || "");
  const exact = TOAST_EXACT_KEYS[text];
  if (exact) return t(exact);
  let match = text.match(/^Level (\d+)! Upgrade point earned\.$/);
  if (match) return state.language === "en" ? text : `${t("lvl", { level: match[1] })}! ${t("toastNeedPoints")}`;
  match = text.match(/^(.+) is empty\.$/);
  if (match) return `${translateLooseName(match[1])} ${state.language === "en" ? "is empty." : t("emptySlot").toLowerCase()}.`;
  match = text.match(/^(.+) equipped\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])} ✓`;
  match = text.match(/^Docking at (.+): 5 seconds\.$/);
  if (match) return t("dockingPrompt", { island: islandName(match[1]), seconds: 5 }).replace(/<[^>]+>/g, "");
  match = text.match(/^Docked at (.+)\. Press R for the market or C to set sail\.$/);
  if (match) return `${t("docked", { island: islandName(match[1]) })}. ${t("pressSailShop").replace(/<[^>]+>/g, "")}`;
  match = text.match(/^Bought (\d+) (.+)\. Replace a hotbar slot\.$/);
  if (match) return state.language === "en" ? text : `${t("buy")} ${match[1]} ${translateLooseName(match[2])}. ${t("replaceAmmoPrompt", { ammo: translateLooseName(match[2]) })}`;
  match = text.match(/^Bought (\d+) (.+)\.$/);
  if (match) return state.language === "en" ? text : `${t("buy")} ${match[1]} ${translateLooseName(match[2])}.`;
  match = text.match(/^Bought (.+)\.$/);
  if (match) return state.language === "en" ? text : `${t("buy")} ${translateLooseName(match[1])}.`;
  match = text.match(/^Sold (.+)\.$/);
  if (match) return state.language === "en" ? text : `${t("sell")} ${translateLooseName(match[1])}.`;
  match = text.match(/^(.+) assigned to slot (\d+)\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])} → ${t("slot", { slot: match[2] })}`;
  match = text.match(/^(.+) launched\.$/);
  if (match) return state.language === "en" ? text : `${shipName(shipCatalog.find((ship) => ship.name === match[1]) || match[1])} ${t("sailing")}.`;
  match = text.match(/^Sell cargo first\. (.+) holds (\d+) regular cargo\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}: ${t("hold")} ${match[2]}.`;
  match = text.match(/^Sell cargo first\. (.+) holds (\d+)\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}: ${t("hold")} ${match[2]}.`;
  match = text.match(/^(.+) cannot carry that much whale blubber\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}: ${t("toastBlubberFull")}`;
  match = text.match(/^(.+) recovered: repairs, gold, and XP\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}: +${t("hp")}, +${t("gold")}, +XP.`;
  match = text.match(/^(.+) reeled in after a hard pull\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])} +XP.`;
  match = text.match(/^(.+) caught by (.+)\.$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}: ${match[2]}.`;
  match = text.match(/^(.+) on the line!$/);
  if (match) return state.language === "en" ? text : `${translateLooseName(match[1])}!`;
  match = text.match(/^Sank a level (\d+) ship\. Crates overboard!$/);
  if (match) return state.language === "en" ? text : `${t("lvl", { level: match[1] })}: ${t("crates")}!`;
  match = text.match(/^Your ship was sunk\. You lost (\d+)g and restarted in a Skiff\.$/);
  if (match) return state.language === "en" ? text : `${t("toastSailsRaised")} ${t("gold")} -${match[1]}. ${shipName("skiff")}.`;
  return text;
}

function refreshLanguageUI() {
  document.documentElement.lang = state.language;
  [ui.languageSelect, ui.hudLanguageSelect, ui.settingsLanguageSelect].forEach((select) => {
    if (!select) return;
    if (!select.options.length) {
      Object.entries(LANGUAGE_OPTIONS).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
    }
    select.value = state.language;
  });
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  const shopTitle = document.querySelector("#shop header strong");
  if (shopTitle) shopTitle.textContent = t("harborMarket");
  if (ui.shopIsland && state.dockedAt) ui.shopIsland.textContent = islandName(state.dockedAt);
  if (ui.playerName) ui.playerName.title = t("captainName");
  refreshGraphicsUI();
  refreshIslandLabels();
  updateAmmoHotbar(true);
  renderInventory();
  updateHud();
  if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
}

function setLanguage(value) {
  const next = normalizeLanguage(value);
  if (state.language === next) return;
  state.language = next;
  saveValue("islandwakeLanguage", next);
  refreshLanguageUI();
}

function refreshGraphicsUI() {
  if (!ui.graphicsSelect) return;
  if (!ui.graphicsSelect.options.length) {
    Object.keys(GRAPHICS_OPTIONS).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      ui.graphicsSelect.appendChild(option);
    });
  }
  [...ui.graphicsSelect.options].forEach((option) => {
    const entry = GRAPHICS_OPTIONS[option.value];
    option.textContent = t(entry?.labelKey || "graphicsHigh");
  });
  ui.graphicsSelect.value = state.graphicsQuality;
}

function graphicsPixelRatio() {
  const entry = GRAPHICS_OPTIONS[state.graphicsQuality] || GRAPHICS_OPTIONS.high;
  const deviceRatio = Number(devicePixelRatio) || 1;
  return Math.max(0.55, Math.min(deviceRatio, entry.pixelRatioCap));
}

function applyGraphicsQuality({ resize = true } = {}) {
  const entry = GRAPHICS_OPTIONS[state.graphicsQuality] || GRAPHICS_OPTIONS.high;
  renderer.setPixelRatio(graphicsPixelRatio());
  renderer.shadowMap.enabled = Boolean(entry.shadows);
  renderer.shadowMap.type = entry.shadowType;
  renderer.shadowMap.needsUpdate = true;
  if (environment.sun) {
    environment.sun.castShadow = Boolean(entry.shadows);
    environment.sun.shadow.mapSize.set(entry.shadowMapSize, entry.shadowMapSize);
    if (environment.sun.shadow.map) {
      environment.sun.shadow.map.dispose();
      environment.sun.shadow.map = null;
    }
    environment.sun.shadow.needsUpdate = true;
  }
  refreshGraphicsUI();
  if (resize) setSize();
}

function setGraphicsQuality(value) {
  const next = normalizeGraphicsQuality(value);
  if (state.graphicsQuality === next) {
    refreshGraphicsUI();
    return;
  }
  state.graphicsQuality = next;
  applyGraphicsQuality();
}

let playerShip;
let character;
let multiplayer = {
  socket: null,
  fastSocket: null,
  channel: null,
  networkId: null,
  mode: "offline",
  lastSent: 0,
  motionLastSent: 0,
  fastReady: false,
  fastReconnectTimer: null,
  hasConnected: false,
  reconnectAttempts: 0,
  reconnectTimer: null,
  serverWorld: false,
};
const islands = [];
const bots = [];
const remotePlayers = new Map();
const projectiles = [];
const seenRemoteShots = new Set();
const seenServerImpacts = new Set();
const pendingShotBatch = [];
let shotBatchQueued = false;
const impactEffects = [];
const projectileSharedAssets = {
  sphereGeometries: new Map(),
  materials: new Map(),
  rocket: null,
  sparkGeometry: null,
  sparkMaterials: new Map(),
};
const fish = [];
const animals = [];
const storms = [];
const waveHazards = [];
const activeKrakenAttacks = [];
const windCurrents = [];
const balloons = [];
const ownedShips = [];
const compassTrailSegments = [];
let compassTrailGroup = null;
const serverBotBalloons = [];
const balloonBombs = [];
const crates = [];
const buildingPieces = [];
const buildingPieceMap = new Map();
const serverBotMap = new Map();
const serverCrateMap = new Map();
const serverFishMap = new Map();
const serverWhaleMap = new Map();
const serverStormMap = new Map();
let buildPreview = null;
let buildPreviewType = null;
let lastBuildPreviewAt = 0;
let lastShopPointerHandledAt = 0;
let lastInventoryPointerHandledAt = 0;
let lastForgePointerHandledAt = 0;
let lastCanvasToolUseAt = 0;
let nextOwnedShipId = 1;
const labels = [];
const ramCooldowns = new Map();
const SHIP_WATERLINE_Y = -0.42;
const CANNONBALL_SPEED = 29.3;
const BOT_CANNON_RANGE = 34;
const botUpgradeCache = new Map();
const MULTIPLAYER_STATE_INTERVAL = 0.22;
const MULTIPLAYER_MOTION_INTERVAL = 0.05;
const REALTIME_SOCKET_MAX_BUFFER = 65536;
const REMOTE_POSITION_LERP = 8;
const REMOTE_ROTATION_LERP = 10;
const SHOT_REPLAY_MAX_AGE_MS = 7000;
const TRANSIENT_EFFECT_REPLAY_MAX_AGE_MS = 4200;
const BOMB_EXPLOSION_REPLAY_MAX_AGE_MS = 2600;
const KRAKEN_ATTACK_REPLAY_MAX_AGE_MS = KRAKEN_ATTACK_LIFE * 1000 + 450;
const CRATE_LIFETIME = 120;
const WHALE_BIT_LIFETIME = 300;
const CRATE_SINK_TIME = 5;
const MAX_TREASURES = 3;
const CENTER_BOT_CLEAR_RADIUS = 88;
const minimapCtx = ui.minimap.getContext("2d");
const shipPreviewCache = new Map();
let ammoHotbarSignature = "";
let hudNameText = "";
let hudLevelText = "";
let hudHpWidth = "";
let hudHpText = "";
let hudXpWidth = "";
let hudStatsText = "";
let hudCargoHtml = "";
let hudDockPromptHtml = "";
let nextHudUpdateAt = 0;
let nextHudPanelRefreshAt = 0;
let nextMinimapRenderAt = 0;
let leaderboardSignature = "";
let spyPanelSignature = "";
const minimapLayerCache = {
  sea: document.createElement("canvas"),
  islands: document.createElement("canvas"),
  signature: "",
};
let shipPreviewRenderer;
let shipPreviewScene;
let shipPreviewCamera;
let fishingLine;
let fishingBobber;
let balloonReticle;
let balloonDirectionArrow;
let leviathan;
let leviathanCooldown = 0;
let tabHiddenAt = 0;
let krakenBoss = null;
let treasureSpawnTimer = 10 + Math.random() * 18;
let nextStormAt = 35 + Math.random() * 85;
const seaDriftObjects = [];
const cloudObjects = [];
const waterfallObjects = [];
const waterfallFoamObjects = [];
const waterfallMistObjects = [];
const hiddenForgeWaterfallObjects = [];
const forgeAnimatedObjects = [];
const shipNightLights = [];
const HUD_PANEL_REFRESH_INTERVAL = 0.12;
const HUD_UPDATE_INTERVAL = 0.08;
const MINIMAP_RENDER_INTERVAL = 0.1;
const ACCOUNT_PROGRESS_INTERVAL = 5;
const SERVER_FISH_VISUAL_INTERVAL = 0.033;
const FISH_RENDER_DISTANCE = 260;
const FISH_RENDER_DISTANCE_SQ = FISH_RENDER_DISTANCE * FISH_RENDER_DISTANCE;
const ISLAND_RENDER_DISTANCE = 760;
const SHIP_RENDER_DISTANCE = 640;
const ENTITY_RENDER_DISTANCE = 560;
const LABEL_RENDER_DISTANCE = 620;
const RENDER_CULL_INTERVAL = 0.18;
let serverFishVisualAccumulator = 0;
let nextRenderCullAt = 0;
let nextAccountProgressAt = 0;
const lastRenderCullFocus = new THREE.Vector3(Infinity, 0, Infinity);
const environment = {
  hemi: null,
  sun: null,
  warm: null,
  moonLight: null,
  celestialRig: null,
  celestialLine: null,
  sunDisc: null,
  moonDisc: null,
  phase: "day",
  lastCycleBucket: -1,
  serverCycleTime: null,
  serverCycleUpdatedAt: 0,
  serverDayLength: DAY_LENGTH_SECONDS,
  serverNightLength: NIGHT_LENGTH_SECONDS,
};
const leviathanAttacks = [
  { id: "breach" },
];

function setCylinderBetween(mesh, start, end) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dir = end.clone().sub(start);
  const length = Math.max(0.01, dir.length());
  mesh.position.copy(mid);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

function distSq2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function setHtmlIfChanged(node, value) {
  if (node && node.innerHTML !== value) node.innerHTML = value;
}

function setWidthIfChanged(node, value) {
  if (node && node.style.width !== value) node.style.width = value;
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function lerpAngle(current, target, amount) {
  return current + angleDelta(target, current) * amount;
}

function timerDeadline(seconds) {
  return Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
}

function timerRemainingSeconds(until) {
  return Math.max(0, (Number(until) || 0) - Date.now()) / 1000;
}

function syncActionCooldowns() {
  state.cooldown = timerRemainingSeconds(state.cooldownUntil);
  state.rodCooldown = timerRemainingSeconds(state.rodCooldownUntil);
  state.turtleFireCooldown = timerRemainingSeconds(state.turtleFireCooldownUntil);
  state.rocketCooldown = timerRemainingSeconds(state.rocketCooldownUntil);
  if (state.turtleFire) state.turtleFireTimer = timerRemainingSeconds(state.turtleFireUntil);
}

function ensureShipRockPhase(group) {
  if (!group?.userData) return 0;
  if (!Number.isFinite(group.userData.shipRockPhase)) group.userData.shipRockPhase = Math.random() * 1000;
  return group.userData.shipRockPhase;
}

function clearShipVisualRock(group, bank = 0) {
  if (!group?.userData?.visualRockApplied) return;
  group.rotation.x = 0;
  group.rotation.z = bank || 0;
  group.userData.visualRockApplied = false;
}

function clearAllShipVisualRock() {
  if (playerShip) clearShipVisualRock(playerShip, state.shipBank || 0);
  bots.forEach((bot) => clearShipVisualRock(bot.group, 0));
  ownedShips.forEach((ship) => clearShipVisualRock(ship.group, 0));
  remotePlayers.forEach((remote) => {
    clearShipVisualRock(remote.group, remote.bank || 0);
    remote.fleetShips?.forEach?.((ship) => clearShipVisualRock(ship.group, 0));
  });
}

function applyShipVisualRock(group, bank = 0, amount = 1) {
  if (!group?.visible || group.userData?.renderCulled) return;
  const phase = ensureShipRockPhase(group);
  const t = clock.elapsedTime;
  group.rotation.x = (Math.sin(t * 0.74 + phase) * 0.0038 + Math.sin(t * 1.31 + phase * 0.37) * 0.0018) * amount;
  group.rotation.z = (bank || 0) + (Math.cos(t * 0.68 + phase * 1.7) * 0.0045 + Math.sin(t * 1.07 + phase * 0.19) * 0.0018) * amount;
  group.userData.visualRockApplied = true;
}

function applyAllShipVisualRock() {
  if (playerShip && !state.fallingOffWorld && !state.leviathanGrabbed) applyShipVisualRock(playerShip, state.shipBank || 0, 1);
  bots.forEach((bot) => applyShipVisualRock(bot.group, 0, 0.9));
  ownedShips.forEach((ship) => applyShipVisualRock(ship.group, 0, 0.8));
  remotePlayers.forEach((remote) => {
    applyShipVisualRock(remote.group, remote.bank || 0, 0.9);
    remote.fleetShips?.forEach?.((ship) => applyShipVisualRock(ship.group, 0, 0.75));
  });
}

function toast(message) {
  ui.toast.textContent = translateMessage(message);
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (ui.toast.textContent = ""), 1800);
}

function captainName() {
  return state.name.trim() || `Captain ${fallbackCaptainNumber}`;
}

function randomCaptainName() {
  return `Captain ${100 + Math.floor(Math.random() * 900)}`;
}

function nameGateOpen() {
  return (ui.nameGate && !ui.nameGate.classList.contains("hidden"))
    || (ui.beginnerGuide && !ui.beginnerGuide.classList.contains("hidden"));
}

function setMenuScreen(open) {
  document.body?.classList.toggle("menu-screen", Boolean(open));
  document.body?.classList.toggle("game-screen", !open);
}

function closeBeginnerGuide() {
  ui.beginnerGuide?.classList.add("hidden");
  ui.guideQuestion?.classList.remove("hidden");
  ui.guideContent?.classList.add("hidden");
}

function showBeginnerQuestion() {
  if (!ui.beginnerGuide || state.guideAsked) return;
  state.guideAsked = true;
  ui.guideQuestion?.classList.remove("hidden");
  ui.guideContent?.classList.add("hidden");
  ui.beginnerGuide.classList.remove("hidden");
}

function showBeginnerGuide() {
  ui.guideQuestion?.classList.add("hidden");
  ui.guideContent?.classList.remove("hidden");
}

function xpForLevel(level) {
  return Math.round((50 + level * 24) * 1.25);
}

function hasGoldDiggerPowers() {
  return state.infiniteGold || String(state.devToken || "").toLowerCase() === "golddigger";
}

function addXP(amount) {
  const maxLevel = state.infiniteLevels ? Number.POSITIVE_INFINITY : MAX_PLAYER_LEVEL;
  if (state.level >= maxLevel) {
    state.level = MAX_PLAYER_LEVEL;
    state.xp = 0;
    return;
  }
  state.xp += amount;
  while (state.level < maxLevel && state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.points++;
    toast(`Level ${state.level}! Upgrade point earned.`);
  }
  if (!state.infiniteLevels && state.level >= MAX_PLAYER_LEVEL) {
    state.level = MAX_PLAYER_LEVEL;
    state.xp = 0;
  }
}

function normalizeShipType(type) {
  const raw = String(type || "").trim();
  if (!raw) return STARTER_SHIP;
  const direct = shipLookup.byId.get(raw);
  if (direct) return direct.id;
  const matched = shipLookup.byCompact.get(compactShipKey(raw));
  return matched?.id || STARTER_SHIP;
}

function getShipStats(type = state.shipType) {
  const normalizedType = normalizeShipType(type);
  return shipLookup.byId.get(normalizedType) || shipCatalog[0];
}

function maxHp() {
  return getShipStats().hp;
}

function shipTier(type) {
  const price = getShipStats(type).price;
  if (price >= 26000) return 6;
  if (price >= 16000) return 5;
  if (price >= 10000) return 4;
  if (price >= 6000) return 3;
  if (price >= 2500) return 2;
  if (price >= 900) return 1;
  return 0;
}

function shipSideCannons(type = state.shipType) {
  type = normalizeShipType(type);
  if (SHIP_SIDE_CANNONS[type]) return SHIP_SIDE_CANNONS[type];
  return clamp(1 + Math.floor((shipTier(type) + 1) / 2), 1, 9);
}

function shipUsesCenterlineGun(type = state.shipType) {
  return false;
}

function broadsideVectors(rotation = 0) {
  const forward = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation)).normalize();
  const right = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation)).normalize();
  return { forward, right, left: right.clone().multiplyScalar(-1) };
}

function shipRotationY(ship, fallback = 0) {
  const y = Number(ship?.rotation?.y);
  if (Number.isFinite(y)) return y;
  const direct = Number(ship?.rotation);
  if (Number.isFinite(direct)) return direct;
  const safeFallback = Number(fallback);
  return Number.isFinite(safeFallback) ? safeFallback : 0;
}

function broadsideSideForDirection(rotation, direction) {
  const flat = direction.clone ? direction.clone() : new THREE.Vector3(direction.x || 0, 0, direction.z || 0);
  flat.y = 0;
  if (flat.lengthSq() < 0.0001) return { side: 1, alignment: 0, direction: broadsideVectors(rotation).right };
  flat.normalize();
  const { right, left } = broadsideVectors(rotation);
  const rightDot = right.dot(flat);
  const leftDot = left.dot(flat);
  const side = rightDot >= leftDot ? 1 : -1;
  return { side, alignment: Math.max(rightDot, leftDot), direction: side > 0 ? right : left };
}

function cannonSideForDirection(rotation, direction, type = state.shipType) {
  if (!shipUsesCenterlineGun(type)) return broadsideSideForDirection(rotation, direction);
  const flat = direction.clone ? direction.clone() : new THREE.Vector3(direction.x || 0, 0, direction.z || 0);
  flat.y = 0;
  const { forward } = broadsideVectors(rotation);
  if (flat.lengthSq() < 0.0001) return { side: 0, alignment: 0, direction: forward };
  flat.normalize();
  return { side: 0, alignment: forward.dot(flat), direction: forward };
}

function broadsideGunSlots(ship, type = state.shipType, sides = [-1, 1]) {
  if (!ship) return [];
  const count = shipSideCannons(type);
  const { length, width } = shipHullDimensions(type);
  const scale = shipVisualScale(type);
  const profile = getShipStats(type).model || type;
  const rotation = shipRotationY(ship, 0);
  const { forward, right } = broadsideVectors(rotation);
  const y = 1.2 * scale;
  if (shipUsesCenterlineGun(type)) {
    const local = new THREE.Vector3(0, y, length * 0.23 * scale);
    const origin = ship.localToWorld ? ship.localToWorld(local.clone()) : ship.position.clone().add(local);
    return [{ side: 0, index: 0, origin, dir: forward.clone() }];
  }
  const sideOffset = width * 0.53 + 0.18 * scale;
  const zSpan = Math.max(1.2, length * 0.58);
  const slots = [];
  sides.forEach((side) => {
    const sideDir = right.clone().multiplyScalar(side).normalize();
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const localZ = -zSpan * 0.5 + t * zSpan;
      const hullSide = hullSideXAt(length, width, scale, localZ, 0.98, profile);
      const localX = count === 1 ? side * (hullSide + 0.2 * scale) : side * sideOffset;
      const local = new THREE.Vector3(localX, y, localZ);
      const origin = ship.localToWorld ? ship.localToWorld(local.clone()) : ship.position.clone().add(local);
      slots.push({ side, index: i, origin, dir: sideDir.clone() });
    }
  });
  return slots;
}

function crateDropCount(target) {
  const level = target.level || 1;
  const tier = target.isBot ? shipTier(target.shipType) : shipTier(state.shipType);
  const base = Math.floor((level + 1) / 4) + Math.max(0, tier);
  return Math.max(1, Math.min(15, Math.ceil(base * CRATE_DROP_MULTIPLIER)));
}

function shipHitRadius(type = state.shipType) {
  return getShipStats(type).hitbox || 3;
}

function shipWeight(type = state.shipType) {
  return Math.max(1, getShipStats(type).weight || 80);
}

function bombDamageForShip(type, amount) {
  const damage = Math.max(0, Number(amount) || 0);
  return type === "turtle" ? damage * 0.5 : damage;
}

function shipVisualScale(type = state.shipType) {
  type = normalizeShipType(type);
  const cached = shipVisualScaleCache.get(type);
  if (cached) return cached;
  const baseScale = SHIP_VISUAL_BASE_SCALE[type] || 1;
  const scale = baseScale * (1 + Math.max(0, shipTier(type) - 3) * 0.055) * 1.2;
  shipVisualScaleCache.set(type, scale);
  return scale;
}

function shipHullDimensions(type = state.shipType) {
  type = normalizeShipType(type);
  const cached = shipHullDimensionCache.get(type);
  if (cached) return cached;
  const [length, width] = SHIP_HULL_DIMENSIONS[type] || DEFAULT_SHIP_HULL_DIMENSIONS;
  const scale = shipVisualScale(type);
  const dimensions = { length: length * scale, width: width * scale };
  shipHullDimensionCache.set(type, dimensions);
  return dimensions;
}

function shipCollisionRadius(type = state.shipType) {
  const { length, width } = shipHullDimensions(type);
  return Math.max(shipHitRadius(type), length * 0.34, width * 0.78);
}

function projectileHitsHull(localPoint, type) {
  const { length, width } = shipHullDimensions(type);
  const halfLength = length * 0.53 + 0.25;
  const zT = Math.abs(localPoint.z) / halfLength;
  if (zT > 1) return false;
  const taper = clamp(1 - Math.pow(zT, 1.65) * 0.82, 0.18, 1);
  const halfWidth = width * 0.52 * taper + 0.18;
  const hullTop = 1.72 * shipVisualScale(type) + shipTier(type) * 0.16;
  if (localPoint.y < -0.42 || localPoint.y > hullTop) return false;
  const deckCurve = clamp(1 - Math.pow(Math.abs(localPoint.x) / Math.max(0.2, halfWidth), 2), 0, 1);
  const allowedY = hullTop - (1 - deckCurve) * 0.42;
  return Math.abs(localPoint.x) <= halfWidth && localPoint.y <= allowedY;
}

function shipHullFootprintHalfWidth(type, localZ, pad = 0) {
  const { length, width } = shipHullDimensions(type);
  const halfLength = length * 0.53 + 0.25 + pad;
  const zT = Math.abs(localZ) / Math.max(0.001, halfLength);
  if (zT > 1) return -1;
  const taper = clamp(1 - Math.pow(zT, 1.65) * 0.82, 0.18, 1);
  return width * 0.52 * taper + 0.18 + pad;
}

function localPointInShipHullFootprint(localPoint, type, pad = 0.16) {
  const { length } = shipHullDimensions(type);
  const halfLength = length * 0.53 + 0.25 + pad;
  if (Math.abs(localPoint.z) > halfLength) return false;
  const halfWidth = shipHullFootprintHalfWidth(type, localPoint.z, pad);
  return halfWidth > 0 && Math.abs(localPoint.x) <= halfWidth;
}

function projectileHitsMast(localPoint, type) {
  const { length } = shipHullDimensions(type);
  const scale = shipVisualScale(type);
  const tier = shipTier(type);
  const mastBottom = 1.05 * scale;
  const mastTop = mastBottom + ((5.2 + Math.min(1.4, tier * 0.32)) * scale - mastBottom) * MAST_SIZE_SCALE;
  if (localPoint.y < mastBottom || localPoint.y > mastTop) return false;
  return mastPlan(type, length / scale).some((mastZ) => {
    const z = -mastZ * scale * MAST_SPACING_SCALE;
    const mastRadius = 0.22 * scale + 0.22;
    return Math.hypot(localPoint.x, localPoint.z - z) <= mastRadius;
  });
}

function projectileHitsShip(shot, ship, type) {
  if (!ship) return false;
  const broadRadius = Math.max(shipHitRadius(type) + 0.75, shipHullDimensions(type).length * 0.56);
  const shipPosition = ship.position || ship;
  const dx = shot.mesh.position.x - shipPosition.x;
  const dz = shot.mesh.position.z - shipPosition.z;
  if (dx * dx + dz * dz >= broadRadius * broadRadius) return false;
  const localPoint = ship.worldToLocal
    ? ship.worldToLocal(projectileHitLocal.copy(shot.mesh.position))
    : projectileHitLocal.copy(shot.mesh.position).sub(shipPosition);
  return projectileHitsHull(localPoint, type) || projectileHitsMast(localPoint, type);
}

function shipDeckLocalY(type = state.shipType) {
  return 1.42 * shipVisualScale(type);
}

function localPointOnShipDeck(localPoint, type = state.shipType) {
  const { length, width } = shipHullDimensions(type);
  const halfLength = length * 0.46;
  if (Math.abs(localPoint.z) > halfLength) return false;
  const zT = Math.abs(localPoint.z) / Math.max(1, halfLength);
  const taper = clamp(1 - Math.pow(zT, 1.85) * 0.72, 0.28, 1);
  const halfWidth = width * 0.42 * taper;
  return Math.abs(localPoint.x) <= halfWidth;
}

function shipStructureBoxes(type = state.shipType) {
  const { length, width } = shipHullDimensions(type);
  const scale = shipVisualScale(type);
  const deckY = shipDeckLocalY(type);
  const boxes = [];
  const addCabinBox = (id, z, w, d, cabinScale = scale, roofY = 2.55 * cabinScale) => {
    boxes.push({ id, z: -z, w: w * cabinScale, d: d * cabinScale, floorY: deckY, roofY });
  };
  const addRawBox = (id, z, w, d, roofY) => {
    boxes.push({ id, z, w, d, floorY: deckY, roofY });
  };
  const largeTypes = new Set(["carrack", "eastindiaman", "firstrate", "fourthrate", "galleon", "manofwar", "manowar", "merchantman", "razee", "superfrigate", "tidebreaker", "treasure", "treasureship"]);
  const largeInteriorTypes = new Set(["carrack", "eastindiaman", "firstrate", "fourthrate", "galleon", "grandfrigate", "manofwar", "manowar", "merchantman", "postship", "razee", "superfrigate", "tidebreaker", "treasure", "treasureship", "windrunner"]);
  const hasLargeArchitecture = (largeTypes.has(type) || shipTier(type) >= 4) && !["whaler", "ballooner", "turtle"].includes(type);
  if (hasLargeArchitecture) {
    const sternRoofY = type === "postship" ? 2.48 * scale : (type === "treasure" || type === "treasureship") ? 2.72 * scale : 2.08 * scale;
    if (largeInteriorTypes.has(type)) {
      const sternCenterZ = -length * 0.34;
      boxes.push({
        id: "stern-table",
        z: sternCenterZ - length * 0.012,
        w: 0.82 * scale,
        d: 0.56 * scale,
        floorY: deckY,
        roofY: 1.62 * scale,
        noRoofWalk: true,
      });
      boxes.push({
        id: "stern-bench",
        z: sternCenterZ - length * 0.05,
        w: width * 0.34,
        d: 0.22 * scale,
        floorY: deckY,
        roofY: 1.5 * scale,
        noRoofWalk: true,
      });
      boxes.push({
        id: "stern-crate",
        x: width * 0.18,
        z: sternCenterZ + length * 0.026,
        w: 0.4 * scale,
        d: 0.4 * scale,
        floorY: deckY,
        roofY: 1.58 * scale,
        noRoofWalk: true,
      });
      if (type === "postship") {
        boxes.push({
          id: "postship-writing-desk",
          x: width * 0.11,
          z: sternCenterZ + length * 0.022,
          w: 0.9 * scale,
          d: 0.48 * scale,
          floorY: deckY,
          roofY: 1.66 * scale,
          noRoofWalk: true,
        });
        boxes.push({
          id: "postship-sea-chest",
          x: -width * 0.19,
          z: sternCenterZ + length * 0.03,
          w: 0.5 * scale,
          d: 0.38 * scale,
          floorY: deckY,
          roofY: 1.62 * scale,
          noRoofWalk: true,
        });
      }
      if (type === "treasure" || type === "treasureship") {
        boxes.push({
          id: "treasure-chart-table",
          z: sternCenterZ + length * 0.018,
          w: 1.04 * scale,
          d: 0.58 * scale,
          floorY: deckY,
          roofY: 1.68 * scale,
          noRoofWalk: true,
        });
        boxes.push({
          id: "treasure-screen-left",
          x: -width * 0.18,
          z: sternCenterZ - length * 0.04,
          w: 0.08 * scale,
          d: 0.9 * scale,
          floorY: deckY,
          roofY: 2.02 * scale,
          noRoofWalk: true,
        });
        boxes.push({
          id: "treasure-screen-right",
          x: width * 0.18,
          z: sternCenterZ - length * 0.04,
          w: 0.08 * scale,
          d: 0.9 * scale,
          floorY: deckY,
          roofY: 2.02 * scale,
          noRoofWalk: true,
        });
        boxes.push({
          id: "treasure-lacquer-chest",
          x: width * 0.2,
          z: sternCenterZ + length * 0.055,
          w: 0.58 * scale,
          d: 0.42 * scale,
          floorY: deckY,
          roofY: 1.62 * scale,
          noRoofWalk: true,
        });
      }
    }
    boxes.push({
      id: "stern-castle",
      z: -length * 0.34,
      w: width * 0.68,
      d: length * 0.17,
      floorY: deckY + 0.02 * scale,
      roofY: sternRoofY,
      interior: largeInteriorTypes.has(type),
    });
    boxes.push({
      id: "forecastle",
      z: length * 0.34,
      w: width * 0.48,
      d: length * 0.12,
      floorY: deckY + 0.02 * scale,
      roofY: 1.72 * scale,
    });
  }
  if (type === "whaler") {
    boxes.push({
      id: "whaler-cabin",
      z: -2.0 * scale,
      w: 2.25 * scale,
      d: 1.2 * scale,
      floorY: deckY,
      roofY: 2.24 * scale,
      interior: true,
    });
    boxes.push({ id: "whaler-map-table", z: -2.0 * scale, w: 0.62 * scale, d: 0.38 * scale, floorY: deckY, roofY: 1.7 * scale, noRoofWalk: true });
    boxes.push({ id: "whaler-bunk", x: -0.68 * scale, z: -1.94 * scale, w: 0.38 * scale, d: 0.74 * scale, floorY: deckY, roofY: 1.62 * scale, noRoofWalk: true });
    boxes.push({ id: "whaler-sea-chest", x: 0.7 * scale, z: -2.25 * scale, w: 0.42 * scale, d: 0.32 * scale, floorY: deckY, roofY: 1.58 * scale, noRoofWalk: true });
    boxes.push({ id: "tryworks", x: 0.55 * scale, z: 0.1 * scale, w: 1.1 * scale, d: 0.8 * scale, floorY: deckY, roofY: 1.95 * scale });
  } else if (type === "modernschooner") {
    boxes.push({ id: "modern-cockpit", z: -1.58 * scale, w: 1.1 * scale, d: 0.9 * scale, floorY: deckY, roofY: 1.85 * scale });
  } else if (type === "ballooner") {
    boxes.push({ id: "ballooner-cabin", z: -1.55 * scale, w: 1.75 * scale, d: 0.92 * scale, floorY: deckY, roofY: 1.94 * scale });
    boxes.push({ id: "balloon-platform", z: -length * 0.36, w: 3.35 * scale, d: 2.55 * scale, floorY: 1.82 * scale, roofY: 1.82 * scale });
  } else if (type === "turtle") {
    [-1, 1].forEach((side) => {
      boxes.push({
        id: `turtle-bench-${side}`,
        x: side * 1.42 * scale,
        z: -0.1 * scale,
        w: 0.48 * scale,
        d: 5.28 * scale,
        floorY: deckY,
        roofY: 1.68 * scale,
        noRoofWalk: true,
      });
      boxes.push({
        id: `turtle-rack-${side}`,
        x: side * 1.88 * scale,
        z: -0.1 * scale,
        w: 0.34 * scale,
        d: 3.68 * scale,
        floorY: deckY,
        roofY: 1.78 * scale,
        noRoofWalk: true,
      });
    });
    for (let row = 0; row < 4; row++) {
      const z = (-2.45 + row * 1.62) * scale;
      boxes.push({
        id: `turtle-table-${row}`,
        z,
        w: 0.84 * scale,
        d: 0.56 * scale,
        floorY: deckY,
        roofY: 1.72 * scale,
        noRoofWalk: true,
      });
      [-1, 1].forEach((side) => {
        boxes.push({
          id: `turtle-lamp-${row}-${side}`,
          x: side * 0.42 * scale,
          z,
          w: 0.22 * scale,
          d: 0.22 * scale,
          floorY: deckY,
          roofY: 1.9 * scale,
          noRoofWalk: true,
        });
      });
    }
    boxes.push({
      id: "turtle-shell",
      z: 0,
      w: 4.65 * scale,
      d: 6.55 * scale,
      floorY: deckY + 0.02 * scale,
      roofY: 2.82 * scale,
      interior: true,
      noRoofWalk: true,
    });
  }
  if (type === "pinnace") addCabinBox("pinnace-cabin", 1.55, 1.35, 0.85, scale * 0.75);
  else if (type === "dart") addCabinBox("cutter-cabin", 1.75, 1.25, 0.78, scale * 0.72);
  else if (type === "sloop") addCabinBox("sloop-cabin", 1.9, 1.35, 0.85, scale * 0.82);
  else if (type === "storm") addCabinBox("sloop-war-cabin", 1.9, 1.45, 0.9, scale * 0.82);
  else if (type === "cog" || type === "hoy") {
    addCabinBox(`${type}-cabin`, 1.45, 1.8, 0.82, scale * 0.78);
    addRawBox(`${type}-stern`, -2.72 * scale, 2.3 * scale, 0.9 * scale, 2.08 * scale);
  } else if (type === "knarr") addCabinBox("knarr-cabin", 1.85, 1.7, 1.0, scale * 0.8);
  else if (type === "schooner" || type === "packet") addRawBox(`${type}-glasshouse`, -1.75 * scale, 1.35 * scale, 0.95 * scale, 1.92 * scale);
  else if (type === "bombketch") addCabinBox("bombketch-cabin", 2.05, 1.9, 1.2, scale * 0.9);
  else if (type === "caravel" || type === "pink" || type === "ketch") addCabinBox(`${type}-cabin`, 2.05, 2.0, 1.15, scale * 0.9);
  else if (type === "fluyt") {
    addCabinBox("fluyt-cabin", 2.25, 2.45, 1.55, scale);
    addRawBox("fluyt-cargo-house", 0, 2.0 * scale, 2.1 * scale, 1.82 * scale);
  } else if (type === "junk") addRawBox("junk-house", -1.55 * scale, 1.8 * scale, 1.18 * scale, 2.18 * scale);
  return boxes;
}

function localPointInShipBox(localPoint, box, pad = 0) {
  const x = box.x || 0;
  return Math.abs(localPoint.x - x) <= box.w * 0.5 + pad
    && Math.abs(localPoint.z - box.z) <= box.d * 0.5 + pad;
}

function shipInteriorAllowed(localPoint, box, type = state.shipType) {
  const scale = shipVisualScale(type);
  if (box.id === "turtle-shell") {
    const wall = 0.18 * scale;
    const halfW = box.w * 0.5;
    const halfD = box.d * 0.5;
    const inner = Math.abs(localPoint.x - (box.x || 0)) < halfW - wall
      && Math.abs(localPoint.z - box.z) < halfD - wall;
    const sternHatch = Math.abs(localPoint.x - (box.x || 0)) < 0.72 * scale
      && localPoint.z - box.z < -halfD + 1.12 * scale;
    return inner || sternHatch;
  }
  const wall = 0.18 * scale;
  const inner = Math.abs(localPoint.x - (box.x || 0)) < box.w * 0.5 - wall
    && Math.abs(localPoint.z - box.z) < box.d * 0.5 - wall;
  const centerFacingZ = box.z < 0 ? box.z + box.d * 0.5 : box.z - box.d * 0.5;
  const generousCabinDoor = ["grandfrigate", "manofwar", "postship", "superfrigate", "tidebreaker", "treasure", "treasureship", "whaler", "windrunner"].includes(type);
  const doorHalfWidth = generousCabinDoor ? 0.62 * scale : 0.48 * scale;
  const doorDepth = generousCabinDoor ? 0.58 * scale : 0.44 * scale;
  const door = Math.abs(localPoint.x - (box.x || 0)) < doorHalfWidth
    && Math.abs(localPoint.z - centerFacingZ) < doorDepth;
  return inner || door;
}

function shipStructureBarrierAt(localPoint, type = state.shipType, currentLocalY = shipDeckLocalY(type)) {
  for (const box of shipStructureBoxes(type)) {
    if (!localPointInShipBox(localPoint, box)) continue;
    const alreadyOnRoof = !box.noRoofWalk && currentLocalY >= box.roofY - 0.34;
    if (alreadyOnRoof) continue;
    if (box.interior) {
      if (!shipInteriorAllowed(localPoint, box, type)) return box;
      continue;
    }
    if (localPoint.y <= box.roofY + 0.45) return box;
  }
  return null;
}

function shipWalkSurfaceAt(localPoint, type = state.shipType, currentLocalY = shipDeckLocalY(type)) {
  const deckY = shipDeckLocalY(type);
  const onHullDeck = localPointOnShipDeck(localPoint, type);
  let surface = onHullDeck ? { y: deckY, kind: "deck" } : null;
  for (const box of shipStructureBoxes(type)) {
    if (!localPointInShipBox(localPoint, box)) continue;
    const alreadyOnRoof = !box.noRoofWalk && currentLocalY >= box.roofY - 0.34;
    if (box.interior) {
      if (shipInteriorAllowed(localPoint, box, type)) return { y: box.floorY, kind: "interior" };
      if (alreadyOnRoof) {
        surface = { y: box.roofY, kind: "roof" };
        continue;
      }
      return null;
    }
    if (!box.noRoofWalk && (box.id === "balloon-platform" || alreadyOnRoof || localPoint.y >= box.roofY - 0.24)) {
      surface = { y: box.roofY, kind: "roof" };
      continue;
    }
    return null;
  }
  return surface;
}

function deckWorldPosition(localX = 0, localZ = 0, type = state.shipType) {
  return playerShip.localToWorld(new THREE.Vector3(localX, shipDeckLocalY(type), localZ));
}

function shipSurfaceWorldPosition(localX, localZ, surfaceY) {
  return playerShip.localToWorld(new THREE.Vector3(localX, surfaceY, localZ));
}

function shipSwimBlockAt(worldPoint) {
  const candidates = [];
  if (playerShip) candidates.push({ group: playerShip, type: state.shipType });
  ownedShips.forEach((ship) => {
    if (ship.group) candidates.push({ group: ship.group, type: ship.type || "skiff" });
  });
  bots.forEach((bot) => {
    if (bot.group) candidates.push({ group: bot.group, type: bot.shipType || "cog" });
  });
  remotePlayers.forEach((remote) => {
    if (remote.group) candidates.push({ group: remote.group, type: remote.shipType || "skiff" });
    remote.fleetShips?.forEach?.((ship) => {
      if (ship.group) candidates.push({ group: ship.group, type: ship.type || "skiff" });
    });
  });
  for (const candidate of candidates) {
    if (!candidate.group || !candidate.type) continue;
    const radius = shipCollisionRadius(candidate.type) + 1.1;
    if (dist2(worldPoint, candidate.group.position) > radius) continue;
    const local = candidate.group.worldToLocal(worldPoint.clone());
    const waterPoint = local.clone();
    waterPoint.y = 0.32 * shipVisualScale(candidate.type);
    if (projectileHitsHull(waterPoint, candidate.type)) return { ...candidate, local };
  }
  return null;
}

function pushSwimmerAwayFromShip(block, dt) {
  if (!block?.group) return;
  const away = character.position.clone().sub(block.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.001) away.set(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
  away.normalize();
  character.position.add(away.multiplyScalar(1.8 * dt));
}

function firstPersonCharacterActive() {
  return !!character?.visible && (state.mode === "land" || state.viewMode === "deck" || state.viewMode === "swim");
}

function resetCharacterHealth() {
  state.characterHp = CHARACTER_MAX_HP;
  state.swimHp = CHARACTER_MAX_HP;
}

function respawnCharacterOnShip(message = "Your character was knocked out and respawned on deck.") {
  if (!playerShip || !character) return;
  closeShop();
  state.mode = "ship";
  state.viewMode = "deck";
  state.dockedAt = null;
  state.activeBalloonIndex = -1;
  resetCharacterHealth();
  character.position.copy(deckWorldPosition(0, 0));
  character.rotation.y = state.rotation;
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
  state.velocity.set(0, 0, 0);
  state.position.copy(playerShip.position);
  toast(message);
  updateHud();
}

function damageCharacter(amount, options = {}) {
  if (!firstPersonCharacterActive()) return false;
  state.characterHp = Math.max(0, state.characterHp - Math.max(1, amount || 1));
  state.swimHp = state.characterHp;
  if (state.characterHp <= 0) {
    respawnCharacterOnShip(options.message || "Your character was knocked out and respawned on deck.");
  }
  return true;
}

function projectileHitsCharacter(shot) {
  if (!firstPersonCharacterActive() || !shot?.mesh || shot.owner === playerId) return false;
  const pos = character.position;
  const radius = state.viewMode === "swim" ? 0.42 : 0.5;
  if (dist2(shot.mesh.position, pos) > radius) return false;
  const bottom = pos.y - 0.08;
  const top = pos.y + (state.viewMode === "swim" ? 0.58 : 1.12);
  return shot.mesh.position.y >= bottom && shot.mesh.position.y <= top;
}


function enterDeckMode() {
  if (state.mode !== "ship" || state.viewMode === "balloon") return;
  if (state.velocity.length() > 0.35) return toast("Stop your ship before walking around.");
  state.viewMode = "deck";
  resetCharacterHealth();
  character.position.copy(deckWorldPosition(0, 0));
  character.rotation.y = state.rotation;
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
  state.velocity.set(0, 0, 0);
  toast("Deck view. Press C for sailing controls.");
}

function returnCharacterToShipDeck() {
  if (!playerShip || state.mode !== "ship") return;
  if (state.dockedAt === "Forge") {
    toast("Use the waterfall to leave the Forge.");
    return;
  }
  state.viewMode = "deck";
  resetCharacterHealth();
  character.position.copy(deckWorldPosition(0, 0));
  character.rotation.y = state.rotation;
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
  toast("Returned to the deck.");
}

function exitDeckMode() {
  if (state.viewMode !== "deck" && state.viewMode !== "swim") return;
  state.viewMode = "ship";
  resetCharacterHealth();
  character.visible = false;
  state.velocity.set(0, 0, 0);
  toast("Sailing controls restored.");
}

function regularCargoCount() {
  return Object.entries(state.cargo).reduce((total, [name, count]) => (
    name === "Whale Blubber" ? total : total + count
  ), 0);
}

function cargoCount() {
  return regularCargoCount() + (state.shipType === "whaler" ? 0 : blubberCount());
}

function totalCargoCount() {
  return regularCargoCount() + blubberCount();
}

function cargoCapacity() {
  return getShipStats().capacity || 8;
}

function blubberCount() {
  return state.cargo["Whale Blubber"] || 0;
}

function blubberCapacity() {
  return state.shipType === "whaler" ? (getShipStats().blubberCapacity || 50) : Math.max(0, cargoCapacity() - cargoCount());
}

function canAddBlubber(amount = 1) {
  const count = Math.max(0, Number(amount) || 0);
  if (state.shipType === "whaler") return blubberCount() + count <= blubberCapacity();
  return totalCargoCount() + count <= cargoCapacity();
}

function marketBuyPrice(island, name) {
  if (name === "Whale Blubber") return 0;
  return island?.goods?.[name] || 0;
}

function marketSellPrice(island, name) {
  if (name === "Whale Blubber") return island?.name === "Portsmouth" ? 200 : 0;
  return Math.max(1, Math.floor(marketBuyPrice(island, name) * TRADE_SELL_RATE));
}

function cannonDamage() {
  return 34 + state.upgrades.damage * 2;
}

function cannonReload() {
  return Math.max(0.36, 0.78 - Math.min(state.upgrades.fireRate, MAX_RELOAD_UPGRADES) * 0.02);
}

function cannonRange() {
  return 34 + state.upgrades.range * 4;
}

function rangeDamageMultiplier(distance, range) {
  return 1 + clamp(distance / Math.max(1, range), 0, 1) * 0.5;
}

function scaleDamageByRange(baseDamage, distance, range) {
  return Math.round(baseDamage * rangeDamageMultiplier(distance, range));
}

function currentAmmoType() {
  const slotType = state.ammoSlots[state.selectedAmmoSlot] || "basic";
  return CANNONBALL_TYPES[slotType] || CANNONBALL_TYPES.basic;
}

function normalizeSelectedAmmoForFire() {
  const maxSlot = Math.max(0, state.ammoSlots.length - 1);
  const selected = Math.floor(Number(state.selectedAmmoSlot));
  if (!Number.isFinite(selected) || selected < 0 || selected > maxSlot) {
    state.selectedAmmoSlot = 0;
  }
  let type = state.ammoSlots[state.selectedAmmoSlot];
  let ammo = CANNONBALL_TYPES[type];
  if (!type || !ammo || (!ammo.infinite && ammoCount(type) <= 0)) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
    type = "basic";
    ammo = CANNONBALL_TYPES.basic;
    updateAmmoHotbar();
  }
  return ammo || CANNONBALL_TYPES.basic;
}

function ammoCount(type) {
  const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
  return ammo.infinite ? Infinity : Math.max(0, Math.floor(state.ammo[type] || 0));
}

function selectAmmoSlot(index, announce = false) {
  const slot = clamp(Math.floor(Number(index) || 0), 0, state.ammoSlots.length - 1);
  const type = state.ammoSlots[slot];
  if (!type) {
    toast("That ammo slot is empty.");
    return false;
  }
  const ammo = CANNONBALL_TYPES[type];
  if (!ammo) return false;
  if (!ammo.infinite && ammoCount(type) <= 0) {
    toast(`${ammo.name} is empty.`);
    return false;
  }
  state.selectedAmmoSlot = slot;
  state.selectedAmmo = type;
  updateAmmoHotbar();
  if (announce) toast(`${ammo.name} equipped.`);
  return true;
}

function selectAmmo(type) {
  const slot = state.ammoSlots.findIndex((item) => item === type);
  if (slot < 0) return toast("Put that shot in a hotbar slot first.");
  selectAmmoSlot(slot);
}

function assignAmmoSlot(slot, type) {
  const index = Math.floor(Number(slot));
  if (!Number.isFinite(index) || index < 0 || index >= state.ammoSlots.length) return;
  if (index === 0) return toast("Basic Shell stays in slot 1.");
  if (type && !CANNONBALL_TYPES[type]) return;
  const nextType = type || null;
  const previousSelectedType = state.ammoSlots[state.selectedAmmoSlot];
  if (nextType) {
    state.ammoSlots.forEach((slotType, slotIndex) => {
      if (slotIndex > 0 && slotIndex !== index && slotType === nextType) {
        state.ammoSlots[slotIndex] = null;
      }
    });
  }
  state.ammoSlots[index] = nextType;
  if (type && state.pendingAmmoAssign === type) state.pendingAmmoAssign = null;
  if (nextType && (state.selectedAmmoSlot === index || previousSelectedType === nextType)) {
    state.selectedAmmoSlot = index;
    state.selectedAmmo = nextType;
  }
  if (state.selectedAmmoSlot === index && !nextType) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
  }
  updateAmmoHotbar();
}

function placeAmmoOnHotbar(type) {
  if (!CANNONBALL_TYPES[type] || CANNONBALL_TYPES[type].infinite) return true;
  if (state.ammoSlots.includes(type)) {
    state.pendingAmmoAssign = null;
    updateAmmoHotbar();
    return true;
  }
  const openSlot = state.ammoSlots.findIndex((item, index) => index > 0 && !item);
  if (openSlot > 0) {
    assignAmmoSlot(openSlot, type);
    return true;
  }
  state.pendingAmmoAssign = type;
  updateAmmoHotbar();
  return false;
}

function consumeAmmo(ammo) {
  if (!ammo || ammo.infinite) return true;
  if (ammoCount(ammo.id) <= 0) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
    updateAmmoHotbar();
    toast(`${ammo.name} is empty.`);
    return false;
  }
  state.ammo[ammo.id] = ammoCount(ammo.id) - 1;
  if (state.ammo[ammo.id] <= 0) {
    state.selectedAmmoSlot = 0;
    state.selectedAmmo = "basic";
  }
  updateAmmoHotbar();
  return true;
}

function rotateFlatDirection(dir, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new THREE.Vector3(dir.x * cos + dir.z * sin, 0, dir.z * cos - dir.x * sin).normalize();
}

function updateAmmoHotbar(force = false) {
  if (!ui.ammoHotbar) return;
  const signature = state.ammoSlots.map((type, index) => {
    if (!type) return `${index}:empty`;
    const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
    return `${index}:${type}:${ammo.infinite ? "inf" : ammoCount(type)}:${state.selectedAmmoSlot === index ? "active" : ""}:${state.language}`;
  }).join("|");
  if (!force && signature === ammoHotbarSignature) return;
  ammoHotbarSignature = signature;
  ui.ammoHotbar.innerHTML = state.ammoSlots.map((type, index) => {
    if (!type) {
      const active = state.selectedAmmoSlot === index ? " active" : "";
      return `<button class="ammo-slot empty${active}" data-ammo-slot="${index}" title="${t("emptySlotTitle")}"><strong>${t("emptySlot")}</strong><em>-</em></button>`;
    }
    const ammo = CANNONBALL_TYPES[type] || CANNONBALL_TYPES.basic;
    const count = ammo.infinite ? "&infin;" : ammoCount(type);
    const active = state.selectedAmmoSlot === index ? " active" : "";
    const empty = !ammo.infinite && ammoCount(type) <= 0 ? " empty" : "";
    return `<button class="ammo-slot${active}${empty}" data-ammo-slot="${index}" title="${ammoName(ammo)}"><strong>${ammoShortName(ammo)}</strong><em>${count}</em></button>`;
  }).join("");
}

function botUpgradeLevels(botOrLevel = 1) {
  const level = Math.max(1, Math.floor(typeof botOrLevel === "number" ? botOrLevel : botOrLevel?.level || 1));
  const focus = typeof botOrLevel === "object" ? botOrLevel.upgradeFocus || "damage" : "damage";
  const cacheKey = `${focus}:${level}`;
  const cached = botUpgradeCache.get(cacheKey);
  if (cached) return cached;
  const order = focus === "reload" ? ["reload", "range", "damage"]
    : focus === "range" ? ["range", "damage", "reload"]
      : ["damage", "reload", "range"];
  const upgrades = { damage: 0, reload: 0, range: 0 };
  for (let i = 0; i < level - 1; i++) {
    for (let offset = 0; offset < order.length; offset++) {
      const kind = order[(i + offset) % order.length];
      if (kind === "reload" && upgrades.reload >= MAX_RELOAD_UPGRADES) continue;
      upgrades[kind]++;
      break;
    }
  }
  botUpgradeCache.set(cacheKey, upgrades);
  return upgrades;
}

function botCannonDamage(botOrLevel = 1) {
  return 34 + botUpgradeLevels(botOrLevel).damage * 2;
}

function botCannonReload(botOrLevel = 1) {
  return Math.max(0.36, 0.78 - botUpgradeLevels(botOrLevel).reload * 0.02);
}

function botCannonRange(botOrLevel = 1) {
  return BOT_CANNON_RANGE + botUpgradeLevels(botOrLevel).range * 4;
}

function compareStatLabel(label, delta, suffix = "") {
  if (!delta) return `<span class="same">${label} =</span>`;
  const sign = delta > 0 ? "+" : "";
  const className = delta > 0 ? "better" : "worse";
  return `<span class="${className}">${label} ${sign}${delta}${suffix}</span>`;
}

function shipCompareMarkup(ship) {
  const current = getShipStats();
  const parts = [
    compareStatLabel(t("hp"), ship.hp - current.hp),
    compareStatLabel(t("armor"), Math.round((ship.armor - current.armor) * 100), "%"),
    compareStatLabel(t("speed"), ship.speed - current.speed),
    compareStatLabel(t("regen"), ship.regen - current.regen),
    compareStatLabel(t("hold"), ship.capacity - current.capacity),
  ];
  return `<div class="ship-compare">${t("vsYourShip", { ship: shipName(current), stats: parts.join(" ") })}</div>`;
}

function playerOwnsShip(type) {
  if (!type) return false;
  const normalizedType = normalizeShipType(type);
  return state.shipType === normalizedType || ownedShips.some((ship) => normalizeShipType(ship.type) === normalizedType);
}

function maybeRollModernSchooner(island) {
  if (island?.name !== "Port Azure" || state.modernSchoonerPurchased) return;
  if (state.infiniteGold) {
    state.modernSchoonerAvailable = true;
    return;
  }
  if (!state.modernSchoonerRolled) {
    state.modernSchoonerRolled = true;
    state.modernSchoonerAvailable = Math.random() < 1 / 1000;
  }
}

const FORGE_PORT_BASE_BY_SHIP = {
  superfrigate: "grandfrigate",
  tidebreaker: "windrunner",
  manofwar: "firstrate",
  treasureship: "treasure",
};

function forgeBaseForPortShip(type) {
  return FORGE_PORT_BASE_BY_SHIP[normalizeShipType(type)] || null;
}

function goldDiggerCanBuyForgeShipAtIsland(type, island) {
  const base = forgeBaseForPortShip(type);
  return Boolean(state.infiniteGold && base && island?.shipMarket?.includes(base));
}

function availableShipsForIsland(island) {
  maybeRollModernSchooner(island);
  const ids = new Set([STARTER_SHIP, ...(island?.shipMarket || [])]);
  if (island?.name === "Port Azure" && (state.modernSchoonerAvailable || playerOwnsShip("modernschooner"))) ids.add("modernschooner");
  Object.keys(FORGE_PORT_BASE_BY_SHIP).forEach((shipId) => {
    if (goldDiggerCanBuyForgeShipAtIsland(shipId, island)) ids.add(shipId);
    else ids.delete(shipId);
  });
  return shipCatalog.filter((ship) => ids.has(ship.id)).sort((a, b) => a.price - b.price);
}

function createOwnedShip(type, hp, position, rotationY = 0, dockedAt = state.dockedAt) {
  const stats = getShipStats(type);
  const group = makeShip(stats.id);
  group.position.copy(position || state.position);
  group.position.y = SHIP_WATERLINE_Y;
  group.rotation.set(0, rotationY || 0, 0);
  scene.add(group);
  const record = {
    id: `fleet-${nextOwnedShipId++}`,
    type: stats.id,
    hp: clamp(Number(hp) || stats.hp, 1, stats.hp),
    dockedAt,
    group,
  };
  ownedShips.push(record);
  return record;
}

function removeOwnedShip(record) {
  if (!record) return;
  if (record.group) scene.remove(record.group);
  const index = ownedShips.indexOf(record);
  if (index >= 0) ownedShips.splice(index, 1);
}

function damageOwnedShip(record, amount, options = {}) {
  if (!record) return false;
  const stats = getShipStats(record.type);
  const armor = options.ignoreArmor ? 0 : stats.armor;
  record.hp -= (Number(amount) || 0) * (1 - armor);
  if (record.hp > 0) return false;
  const type = record.type;
  makeSplinterEffect(record.group.position.clone().setY(1.2), new THREE.Vector3(1, 0, 0));
  removeOwnedShip(record);
  toast(`Your docked ${shipName(type)} was destroyed.`);
  multiplayer.lastSent = 0;
  return true;
}

function shipSpawnClear(point, type, ignore = null, rotation = playerShip?.rotation?.y ?? state.rotation) {
  const radius = shipCollisionRadius(type) * 0.9;
  if (islands.some((island) => dist2(point, island.group.position) < island.radius + radius + 4)) return false;
  const overlapsShip = (other, otherType, otherRotation = 0) => {
    if (!other || other === ignore) return false;
    const dx = point.x - other.position.x;
    const dz = point.z - other.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.001) return true;
    const normal = new THREE.Vector3(dx / distance, 0, dz / distance);
    return distance < shipSeparationDistance(type, otherType, normal, rotation, otherRotation) + 1.35;
  };
  if (playerShip && overlapsShip(playerShip, state.shipType, playerShip.rotation.y)) return false;
  if (ownedShips.some((ship) => overlapsShip(ship.group, ship.type, ship.group.rotation.y))) return false;
  return true;
}

function spawnPositionBesideCurrentShip(type, island = null) {
  const base = playerShip?.position?.clone() || state.position.clone();
  const rotation = playerShip?.rotation?.y ?? state.rotation;
  const sideCandidates = [];
  const fallbackCandidates = [];
  const islandCenter = island?.group?.position || islandData.find((item) => item.name === island?.name);
  if (islandCenter) {
    const radius = island?.radius || 34;
    const center = new THREE.Vector3(islandCenter.x, 0, islandCenter.z);
    const fromCenter = base.clone().sub(center);
    fromCenter.y = 0;
    if (fromCenter.lengthSq() < 0.001) fromCenter.set(Math.sin(rotation), 0, Math.cos(rotation));
    const baseAngle = Math.atan2(fromCenter.x, fromCenter.z);
    const circleRadius = Math.max(
      fromCenter.length(),
      radius + Math.max(shipCollisionRadius(type), shipCollisionRadius(state.shipType)) * 0.95 + 5.5,
    );
    const tangentNormal = new THREE.Vector3(Math.cos(baseAngle), 0, -Math.sin(baseAngle)).normalize();
    const sideOffset = shipSeparationDistance(type, state.shipType, tangentNormal, rotation, rotation) + 5;
    const angularOffset = sideOffset / Math.max(circleRadius, 12);
    const pointOnDockCircle = (angle, radialExtra = 0) => new THREE.Vector3(
      center.x + Math.sin(angle) * (circleRadius + radialExtra),
      SHIP_WATERLINE_Y,
      center.z + Math.cos(angle) * (circleRadius + radialExtra),
    );
    [1, 1.25, 1.55, 1.9, 2.3, 2.8].forEach((scale) => {
      sideCandidates.push(pointOnDockCircle(baseAngle + angularOffset * scale));
      sideCandidates.push(pointOnDockCircle(baseAngle - angularOffset * scale));
    });
    [4, 9, 15, 24].forEach((extra) => {
      fallbackCandidates.push(pointOnDockCircle(baseAngle + angularOffset, extra));
      fallbackCandidates.push(pointOnDockCircle(baseAngle - angularOffset, extra));
    });
  } else {
    const { right, forward } = broadsideVectors(rotation);
    const sideOffset = shipSeparationDistance(type, state.shipType, right, rotation, rotation) + 4.5;
    const forwardOffset = shipSeparationDistance(type, state.shipType, forward, rotation, rotation) + 5.5;
    [1, 1.35, 1.8, 2.35].forEach((scale) => {
      sideCandidates.push(base.clone().add(right.clone().multiplyScalar(sideOffset * scale)));
      sideCandidates.push(base.clone().add(right.clone().multiplyScalar(-sideOffset * scale)));
      fallbackCandidates.push(base.clone().add(forward.clone().multiplyScalar(forwardOffset * scale)));
      fallbackCandidates.push(base.clone().add(forward.clone().multiplyScalar(-forwardOffset * scale)));
    });
  }
  return sideCandidates.find((candidate) => shipSpawnClear(candidate, type, null, rotation))
    || fallbackCandidates.find((candidate) => shipSpawnClear(candidate, type, null, rotation))
    || sideCandidates[0]
    || fallbackCandidates[0]
    || base;
}

function parkCurrentShipAtIsland(islandName = state.dockedAt) {
  if (!playerShip || !state.shipType) return null;
  return createOwnedShip(state.shipType, state.hp, playerShip.position.clone(), playerShip.rotation.y, islandName);
}

function bestLivingFleetShip() {
  return ownedShips
    .filter((ship) => ship.hp > 0)
    .slice()
    .sort((a, b) => (getShipStats(b.type).price || 0) - (getShipStats(a.type).price || 0))[0] || null;
}

function switchToFleetShip(record) {
  if (!record || !state.dockedAt || record.dockedAt !== state.dockedAt) return false;
  const currentIsland = state.dockedAt;
  const currentPosition = playerShip?.position?.clone() || state.position.clone();
  const currentRotation = playerShip?.rotation?.y ?? state.rotation;
  createOwnedShip(state.shipType, state.hp, currentPosition, currentRotation, currentIsland);
  const targetPosition = record.group.position.clone();
  const targetRotation = record.group.rotation.y;
  const targetHp = record.hp;
  const targetType = record.type;
  removeOwnedShip(record);
  replacePlayerShip(targetType, targetPosition, { hp: targetHp, rotation: targetRotation });
  state.mode = "land";
  state.dockedAt = currentIsland;
  if (character) {
    character.position.copy(deckWorldPosition(0, 0, state.shipType));
    character.position.y += 0.08;
    character.visible = true;
    state.walkingPos.copy(character.position);
  }
  multiplayer.lastSent = 0;
  toast(`${shipName(targetType)} ready.`);
  return true;
}

function switchToNextDockedFleetShip() {
  if (state.mode !== "land" || !state.dockedAt) return false;
  const choices = ownedShips.filter((ship) => ship.dockedAt === state.dockedAt);
  if (!choices.length) {
    toast("No other owned ships are docked here.");
    return true;
  }
  return switchToFleetShip(choices[0]);
}

function replacePlayerShip(type, spawnPosition = null, options = {}) {
  const ship = getShipStats(type);
  const old = playerShip;
  const position = spawnPosition || old?.position || state.position;
  const rotationY = Number.isFinite(Number(options.rotation))
    ? Number(options.rotation)
    : Number.isFinite(old?.rotation?.y) ? old.rotation.y : state.rotation;
  state.shipType = ship.id;
  state.hp = clamp(Number(options.hp) || ship.hp, 1, ship.hp);
  if (ship.id !== "whaler") {
    state.whalerNets = false;
    state.whalerNetProgress = 0;
  }
  if (ship.id !== "turtle") {
    state.turtleFire = false;
    state.turtleFireTimer = 0;
    state.turtleFireCooldown = 0;
    state.turtleFireUntil = 0;
    state.turtleFireCooldownUntil = 0;
  }
  if (ship.id !== "rocketeer") {
    state.rocketBurst = null;
    state.rocketCooldown = 0;
    state.rocketCooldownUntil = 0;
  }
  state.cooldown = 0;
  state.cooldownUntil = 0;
  state.rodCooldown = 0;
  state.rodCooldownUntil = 0;
  setTool("cannon");
  playerShip = makeShip(ship.id);
  updateWhalerNetVisuals(playerShip, state.whalerNets, 1);
  updateTurtleFireVisual(playerShip, state.turtleFire, 1);
  playerShip.position.copy(position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  playerShip.rotation.set(0, rotationY, 0);
  if (old) scene.remove(old);
  scene.add(playerShip);
  state.position.copy(playerShip.position);
  state.rotation = playerShip.rotation.y;
  updateAmmoHotbar(true);
}

let googleIdentityScriptPromise = null;
let googleCredentialHandler = null;

function googleClientId() {
  return String(window.ISLANDWAKE_GOOGLE_CLIENT_ID || document.querySelector('meta[name="google-signin-client_id"]')?.content || "").trim();
}

function googleModeLabel() {
  return state.accountMode === "create" ? "Sign up with Google" : "Log in with Google";
}

function decodeGoogleJwtPayload(token) {
  const body = String(token || "").split(".")[1] || "";
  if (!body) throw new Error("Google did not send account details.");
  const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function googleNameFromPayload(payload = {}) {
  const emailName = String(payload.email || "").split("@")[0] || "";
  return String(payload.name || emailName || "Google Captain").trim().replace(/\s+/g, " ").slice(0, 24) || "Google Captain";
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;
  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(script);
  });
  return googleIdentityScriptPromise;
}

function renderGoogleAccountButton() {
  if (ui.googleAccountLabel) ui.googleAccountLabel.textContent = googleModeLabel();
  ui.googleButtonMount?.classList.add("hidden");
  ui.googleAccountButton?.classList.toggle("hidden", !state.accountMode);
}

function startGoogleAccountPrompt() {
  const clientId = googleClientId();
  if (!clientId) {
    setAccountMode(state.accountMode || "signin", "Google login is not ready yet. Use username and password for now.");
    return;
  }
  if (ui.accountStatus) ui.accountStatus.textContent = "Opening Google sign-in window...";
  loadGoogleIdentityScript()
    .then((google) => {
      if (!google.accounts.oauth2?.initTokenClient) throw new Error("Google popup sign-in could not load.");
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        prompt: "select_account",
        callback: (response) => googleCredentialHandler?.({ accessToken: response?.access_token || "", error: response?.error || "" }),
        error_callback: () => {
          if (ui.accountStatus) ui.accountStatus.textContent = "Google sign-in window was closed or blocked.";
        },
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
    })
    .catch(() => {
      if (ui.accountStatus) ui.accountStatus.textContent = "Google sign-in could not load. Check your connection and try again.";
    });
}

function setAccountMode(mode = "", message = "") {
  const next = mode === "create" || mode === "signin" ? mode : "";
  state.accountMode = next;
  if (!next) {
    state.accountName = "";
    state.accountPassword = "";
    state.googleAccount = null;
    ui.nameForm?.classList.remove("hidden");
    ui.accountMini?.classList.remove("hidden");
    ui.accountPanel?.classList.add("hidden");
    if (ui.accountNameInput) ui.accountNameInput.value = "";
    if (ui.accountPasswordInput) ui.accountPasswordInput.value = "";
    ui.googleButtonMount?.classList.add("hidden");
    ui.googleAccountButton?.classList.add("hidden");
  } else {
    ui.nameForm?.classList.add("hidden");
    ui.accountMini?.classList.add("hidden");
    ui.accountPanel?.classList.remove("hidden");
  }
  if (ui.accountModeInput) ui.accountModeInput.value = next;
  if (ui.accountTitle) ui.accountTitle.textContent = next === "create" ? "Create account" : next === "signin" ? "Log in" : "Account";
  if (ui.accountSubmit) ui.accountSubmit.textContent = next === "create" ? "Create account" : "Log in";
  if (ui.accountStatus) {
    ui.accountStatus.textContent = message || "";
  }
  renderGoogleAccountButton();
}

function accountModeFromFields() {
  if (state.googleAccount?.credential || state.googleAccount?.accessToken) return state.accountMode === "create" ? "create" : "signin";
  const hasAccount = Boolean(String(state.accountName || "").trim() && String(state.accountPassword || ""));
  if (!hasAccount) return "";
  return state.accountMode === "create" ? "create" : "signin";
}

function activeShipProgressRecord() {
  const position = playerShip?.position || state.position;
  const rotation = playerShip?.rotation?.y ?? state.rotation;
  const stats = getShipStats(state.shipType);
  return {
    type: stats.id,
    hp: Math.ceil(clamp(Number(state.hp) || stats.hp, 1, stats.hp)),
    x: position.x,
    z: position.z,
    rotation,
    dockedAt: state.dockedAt || "",
    mode: state.mode === "land" && state.dockedAt ? "land" : "ship",
  };
}

function accountPayload() {
  if (state.googleAccount?.credential || state.googleAccount?.accessToken) {
    return {
      provider: "google",
      credential: state.googleAccount.credential,
      accessToken: state.googleAccount.accessToken || "",
      name: String(state.googleAccount.name || state.accountName || "").trim().replace(/\s+/g, " ").slice(0, 24),
      email: String(state.googleAccount.email || "").trim().slice(0, 120),
      mode: accountModeFromFields(),
      noSave: hasGoldDiggerPowers(),
    };
  }
  const name = String(state.accountName || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const password = String(state.accountPassword || "");
  if (!name || !password) return null;
  return { name, password, mode: accountModeFromFields(), noSave: hasGoldDiggerPowers() };
}

function accountProgressSnapshot(options = {}) {
  if (options.accountSave && hasGoldDiggerPowers()) return null;
  const activeShip = activeShipProgressRecord();
  return {
    name: state.name,
    level: state.level,
    xp: state.xp,
    gold: Math.floor(state.gold),
    points: state.points,
    shipType: state.shipType,
    hp: Math.ceil(state.hp),
    cargo: { ...state.cargo },
    upgrades: { ...state.upgrades },
    ammo: { ...state.ammo },
    ammoSlots: [...state.ammoSlots],
    selectedAmmo: state.selectedAmmo,
    balloonStock: state.balloonStock,
    maxBalloons: state.maxBalloons,
    items: { ...state.items, cursedCompass: false },
    mode: activeShip.mode,
    dockedAt: activeShip.dockedAt,
    activeShip,
    fleetShips: ownedShips.slice(0, 12).map((ship) => ({
      type: ship.type,
      hp: ship.hp,
      dockedAt: ship.dockedAt,
      x: ship.group.position.x,
      z: ship.group.position.z,
      rotation: ship.group.rotation.y,
    })),
  };
}

function cleanSavedCount(value, max = 999999) {
  return clamp(Math.floor(Number(value) || 0), 0, max);
}

function cleanSavedObject(source, keys, max = 999999) {
  const result = {};
  if (!source || typeof source !== "object") return result;
  keys.forEach((key) => {
    const value = cleanSavedCount(source[key], max);
    if (value > 0) result[key] = value;
  });
  return result;
}

function applyAccountProgress(progress) {
  if (!progress || typeof progress !== "object") return;
  const active = progress.activeShip && typeof progress.activeShip === "object" ? progress.activeShip : progress;
  const ship = getShipStats(active.type || progress.shipType || STARTER_SHIP);
  if (!state.infiniteLevels) {
    state.level = clamp(Math.floor(Number(progress.level) || 1), 1, MAX_PLAYER_LEVEL);
    state.xp = Math.max(0, Math.floor(Number(progress.xp) || 0));
    state.points = Math.max(0, Math.floor(Number(progress.points) || 0));
  }
  if (!state.infiniteGold) state.gold = Math.max(0, Math.floor(Number(progress.gold) || state.gold));
  state.cargo = cleanSavedObject(progress.cargo, [...goods, "Whale Blubber"], 999);
  state.upgrades = {
    damage: cleanSavedCount(progress.upgrades?.damage, 100),
    fireRate: Math.min(MAX_RELOAD_UPGRADES, cleanSavedCount(progress.upgrades?.fireRate, MAX_RELOAD_UPGRADES)),
    range: cleanSavedCount(progress.upgrades?.range, 100),
  };
  state.ammo = {
    grapeshot: cleanSavedCount(progress.ammo?.grapeshot, 9999),
    hotshot: cleanSavedCount(progress.ammo?.hotshot, 9999),
    harpoon: cleanSavedCount(progress.ammo?.harpoon, 9999),
    airburst: cleanSavedCount(progress.ammo?.airburst, 9999),
    rocketburst: cleanSavedCount(progress.ammo?.rocketburst, 9999),
  };
  if (Array.isArray(progress.ammoSlots)) {
    const slots = progress.ammoSlots.slice(0, 5).map((id) => (CANNONBALL_TYPES[id] ? id : null));
    slots[0] = "basic";
    while (slots.length < 5) slots.push(null);
    state.ammoSlots = slots;
  }
  const savedSelectedAmmo = CANNONBALL_TYPES[progress.selectedAmmo] ? progress.selectedAmmo : "basic";
  const savedSelectedSlot = state.ammoSlots.indexOf(savedSelectedAmmo);
  state.selectedAmmoSlot = savedSelectedSlot >= 0 ? savedSelectedSlot : 0;
  state.selectedAmmo = savedSelectedSlot >= 0 ? savedSelectedAmmo : "basic";
  state.balloonStock = clamp(Math.floor(Number(progress.balloonStock) || 0), 0, state.maxBalloons);
  state.items = { ...state.items, ...(progress.items && typeof progress.items === "object" ? progress.items : {}), cursedCompass: false };
  const fallbackPosition = playerShip?.position?.clone() || state.position.clone();
  const position = new THREE.Vector3(
    Number.isFinite(Number(active.x)) ? Number(active.x) : fallbackPosition.x,
    SHIP_WATERLINE_Y,
    Number.isFinite(Number(active.z)) ? Number(active.z) : fallbackPosition.z
  );
  const rotation = Number.isFinite(Number(active.rotation)) ? Number(active.rotation) : (playerShip?.rotation?.y ?? state.rotation);
  replacePlayerShip(ship.id, position, { hp: active.hp ?? progress.hp, rotation });
  const savedDockedAt = String(active.dockedAt || progress.dockedAt || "");
  const savedMode = (active.mode || progress.mode) === "land" && savedDockedAt ? "land" : "ship";
  state.mode = savedMode;
  state.dockedAt = savedMode === "land" ? savedDockedAt : null;
  state.viewMode = "ship";
  if (character) {
    if (savedMode === "land") {
      character.position.copy(deckWorldPosition(0, 0, state.shipType));
      character.position.y += 0.08;
      character.visible = true;
      state.walkingPos.copy(character.position);
      state.walkVelocityY = 0;
      state.grounded = true;
    } else {
      character.visible = false;
    }
  }
  ownedShips.slice().forEach(removeOwnedShip);
  (Array.isArray(progress.fleetShips) ? progress.fleetShips : []).slice(0, 12).forEach((entry) => {
    const fleetShip = getShipStats(entry?.type || STARTER_SHIP);
    const pos = new THREE.Vector3(
      Number.isFinite(Number(entry?.x)) ? Number(entry.x) : position.x + 12,
      SHIP_WATERLINE_Y,
      Number.isFinite(Number(entry?.z)) ? Number(entry.z) : position.z + 12
    );
    createOwnedShip(fleetShip.id, entry?.hp, pos, Number(entry?.rotation) || 0, String(entry?.dockedAt || ""));
  });
  state.accountAuthed = true;
  setAccountMode(state.accountMode, `Signed in as ${state.accountName || "account"}. Progress loaded.`);
  multiplayer.lastSent = 0;
  renderInventory();
  if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
  updateHud();
}

function setSize() {
  renderer.setPixelRatio(graphicsPixelRatio());
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

addEventListener("resize", setSize);
setSize();

function mat(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

const mats = {
  water: new THREE.MeshStandardMaterial({ color: 0x35b7d4, roughness: 0.5, metalness: 0.04 }),
  shallows: new THREE.MeshStandardMaterial({ color: 0x6ed7cf, roughness: 0.66, metalness: 0.02, transparent: true, opacity: 0.72 }),
  sand: mat(0xe9d28a),
  grass: mat(0x70bf61),
  rock: mat(0x7e8991),
  wood: mat(0x8b5a32),
  sail: mat(0xfff5da),
  dark: mat(0x2f3342),
  gold: mat(0xd99928),
  white: mat(0xf8f4e5),
  red: mat(0xd54b3f),
  crate: mat(0xb87533),
  hull: mat(0x6b432b),
  hullDark: mat(0x3f2d24),
  rope: mat(0x5a3b25),
  plank: mat(0xb77b42),
};

function addLights() {
  const hemi = new THREE.HemisphereLight(0xdaf7ff, 0x5f8f73, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -145;
  sun.shadow.camera.right = 145;
  sun.shadow.camera.top = 145;
  sun.shadow.camera.bottom = -145;
  scene.add(sun);
  scene.add(sun.target);
  const warm = new THREE.DirectionalLight(0xffdba0, 0.85);
  warm.position.set(80, 36, -70);
  scene.add(warm);
  scene.add(warm.target);
  const moonLight = new THREE.DirectionalLight(0xaec8ff, 0);
  moonLight.position.set(80, 60, -70);
  scene.add(moonLight);
  scene.add(moonLight.target);
  const celestialEdgeDistance = WATERFALL_LIMIT + 620;
  const celestialSideDrift = WATERFALL_LIMIT * 0.14;
  const celestialRig = new THREE.Group();
  celestialRig.position.set(0, 20, 0);
  scene.add(celestialRig);
  const celestialLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-celestialEdgeDistance, 0, -celestialSideDrift),
      new THREE.Vector3(celestialEdgeDistance, 0, celestialSideDrift),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false })
  );
  celestialLine.visible = false;
  celestialRig.add(celestialLine);
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(12, 24, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff1a6, fog: false })
  );
  sunDisc.position.set(-celestialEdgeDistance, 0, -celestialSideDrift);
  celestialRig.add(sunDisc);
  const moonDisc = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 24, 14),
    new THREE.MeshBasicMaterial({ color: 0xdfe9ff, fog: false })
  );
  const moonShadow = new THREE.Mesh(
    new THREE.SphereGeometry(8.65, 24, 14),
    new THREE.MeshBasicMaterial({ color: 0x18243a, fog: false })
  );
  moonShadow.position.set(3.1, 1.1, 1.1);
  moonDisc.add(moonShadow);
  moonDisc.position.set(celestialEdgeDistance, 0, celestialSideDrift);
  celestialRig.add(moonDisc);
  Object.assign(environment, { hemi, sun, warm, moonLight, celestialRig, celestialLine, sunDisc, moonDisc });
}

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lightingFocusPosition() {
  const balloon = state.viewMode === "balloon" ? activeBalloon() : null;
  if (balloon?.group && !balloon.destroyed) return balloon.group.position;
  if ((state.viewMode === "deck" || state.viewMode === "swim" || state.mode === "land") && character) return character.position;
  if (playerShip) return playerShip.position;
  return state.position;
}

function renderDistanceVisible(position, distance, radius = 0, focus = lightingFocusPosition()) {
  if (!position || !focus) return true;
  const limit = distance + Math.max(0, radius || 0);
  const dx = (position.x || 0) - (focus.x || 0);
  const dz = (position.z || 0) - (focus.z || 0);
  return dx * dx + dz * dz <= limit * limit;
}

function setRenderableVisible(object, visible) {
  if (!object) return;
  const nextVisible = Boolean(visible);
  if (object.visible !== nextVisible) object.visible = nextVisible;
  if (object.userData.renderCulled !== !nextVisible) object.userData.renderCulled = !nextVisible;
}

function updateRenderDistanceCulling(force = false) {
  if (!state.joined) return;
  const focus = lightingFocusPosition();
  const movedEnough = !Number.isFinite(lastRenderCullFocus.x) || distSq2(focus, lastRenderCullFocus) > 18 * 18;
  if (!force && clock.elapsedTime < nextRenderCullAt && !movedEnough) return;
  nextRenderCullAt = clock.elapsedTime + RENDER_CULL_INTERVAL;
  lastRenderCullFocus.copy(focus);
  islands.forEach((island) => {
    const near = state.dockedAt === island.name
      || renderDistanceVisible(island.group.position, ISLAND_RENDER_DISTANCE, island.radius, focus);
    setRenderableVisible(island.group, near);
    if (island.label) {
      const labelVisible = near
        && !island.hiddenLabel
        && renderDistanceVisible(island.group.position, LABEL_RENDER_DISTANCE, island.radius, focus);
      setRenderableVisible(island.label, labelVisible);
    }
  });
  bots.forEach((bot) => setRenderableVisible(bot.group, renderDistanceVisible(bot.group.position, SHIP_RENDER_DISTANCE, shipHitRadius(bot.shipType), focus)));
  ownedShips.forEach((ship) => setRenderableVisible(ship.group, renderDistanceVisible(ship.group.position, SHIP_RENDER_DISTANCE, shipHitRadius(ship.type), focus)));
  remotePlayers.forEach((remote) => {
    setRenderableVisible(remote.group, renderDistanceVisible(remote.group.position, SHIP_RENDER_DISTANCE, shipHitRadius(remote.shipType), focus));
    remote.fleetShips?.forEach?.((ship) => setRenderableVisible(ship.group, renderDistanceVisible(ship.group.position, SHIP_RENDER_DISTANCE, shipHitRadius(ship.type), focus)));
    remote.balloons?.forEach?.((balloon) => setRenderableVisible(balloon.group, renderDistanceVisible(balloon.group.position, ENTITY_RENDER_DISTANCE, 12, focus)));
  });
  animals.forEach((animal) => setRenderableVisible(animal.group, renderDistanceVisible(animal.group.position, ENTITY_RENDER_DISTANCE, animal.kind === "whale" ? 18 : 8, focus)));
  crates.forEach((crate) => setRenderableVisible(crate.mesh, renderDistanceVisible(crate.mesh.position, ENTITY_RENDER_DISTANCE, 6, focus)));
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const active = activeBalloon() === balloon;
    setRenderableVisible(balloon.group, active || renderDistanceVisible(balloon.group.position, ENTITY_RENDER_DISTANCE, 12, focus));
  });
  serverBotBalloons.forEach((balloon) => setRenderableVisible(balloon.group, renderDistanceVisible(balloon.group.position, ENTITY_RENDER_DISTANCE, 12, focus)));
  projectiles.forEach((shot) => {
    const visible = renderDistanceVisible(shot.mesh.position, ENTITY_RENDER_DISTANCE, 12, focus);
    setRenderableVisible(shot.mesh, visible);
    setRenderableVisible(shot.trail, visible);
  });
  balloonBombs.forEach((bomb) => setRenderableVisible(bomb.mesh, renderDistanceVisible(bomb.mesh.position, ENTITY_RENDER_DISTANCE, 14, focus)));
}

function aimDirectionalLightFromCelestial(light, celestialPosition, focusPosition, distance = 760) {
  const direction = celestialPosition.clone().sub(focusPosition);
  if (direction.lengthSq() < 0.001) direction.set(0, 1, 0);
  direction.normalize();
  light.position.copy(focusPosition).add(direction.multiplyScalar(distance));
  light.target.position.copy(focusPosition);
  light.updateMatrixWorld();
  light.target.updateMatrixWorld();
}

function updateShipNightLights(amount) {
  for (let i = shipNightLights.length - 1; i >= 0; i--) {
    const rig = shipNightLights[i];
    if (!rig?.group?.parent) {
      shipNightLights.splice(i, 1);
      continue;
    }
    rig.material.opacity = amount;
    if (rig.haloMaterial) rig.haloMaterial.opacity = 0;
    rig.lights.forEach((light) => {
      light.intensity = amount * rig.baseIntensity;
    });
  }
}

function updateDayNightCycle() {
  if (!environment.sun || !environment.hemi) return;
  const dayLength = Math.max(60, Number(environment.serverDayLength) || DAY_LENGTH_SECONDS);
  const nightLength = Math.max(60, Number(environment.serverNightLength) || NIGHT_LENGTH_SECONDS);
  const cycleLength = dayLength + nightLength;
  const serverSynced = Number.isFinite(environment.serverCycleTime);
  const cycleTime = serverSynced
    ? (environment.serverCycleTime + Math.max(0, clock.elapsedTime - environment.serverCycleUpdatedAt)) % cycleLength
    : clock.elapsedTime % cycleLength;
  const isNight = cycleTime >= dayLength;
  const dayProgress = clamp(cycleTime / dayLength, 0, 1);
  const nightProgress = isNight ? clamp((cycleTime - dayLength) / nightLength, 0, 1) : 0;
  const cycleProgress = isNight ? 0.5 + nightProgress * 0.5 : dayProgress * 0.5;
  const sunriseProgress = !isNight ? clamp(cycleTime / SUNRISE_SECONDS, 0, 1) : 0;
  const sunsetProgress = !isNight ? clamp((cycleTime - (dayLength - SUNSET_SECONDS)) / SUNSET_SECONDS, 0, 1) : 0;
  const sunriseTransition = !isNight && cycleTime < SUNRISE_SECONDS ? 1 - smoothStep(sunriseProgress) : 0;
  const sunsetTransition = !isNight && cycleTime > dayLength - SUNSET_SECONDS ? smoothStep(sunsetProgress) : 0;
  const sunriseWarmth = !isNight && cycleTime < SUNRISE_SECONDS
    ? Math.sin(sunriseProgress * Math.PI)
    : 0;
  const sunsetWarmth = !isNight && cycleTime > dayLength - SUNSET_SECONDS
    ? Math.sin(sunsetProgress * Math.PI)
    : 0;
  const nightFactor = isNight ? 1 : clamp(Math.max(sunriseTransition, sunsetTransition), 0, 1);
  const dayAmount = 1 - nightFactor;
  const twilight = clamp(Math.max(sunriseWarmth, sunsetWarmth), 0, 1);

  const celestialAngle = cycleProgress * Math.PI * 2;
  const celestialEdgeDistance = WATERFALL_LIMIT + 620;
  const celestialSideDrift = WATERFALL_LIMIT * 0.14;
  const horizontalX = -Math.cos(celestialAngle) * celestialEdgeDistance;
  const horizontalZ = -Math.cos(celestialAngle) * celestialSideDrift;
  const verticalY = Math.sin(celestialAngle) * 520;
  const sunLocal = new THREE.Vector3(horizontalX, verticalY, horizontalZ);
  const moonLocal = sunLocal.clone().multiplyScalar(-1);
  environment.sunDisc.position.copy(sunLocal);
  environment.moonDisc.position.copy(moonLocal);
  if (environment.celestialLine?.geometry) {
    environment.celestialLine.geometry.setFromPoints([sunLocal, moonLocal]);
  }
  const sunPos = environment.sunDisc.getWorldPosition(new THREE.Vector3());
  const moonPos = environment.moonDisc.getWorldPosition(new THREE.Vector3());
  const lightFocus = lightingFocusPosition().clone();
  lightFocus.y += state.viewMode === "balloon" ? 6 : 1.2;
  aimDirectionalLightFromCelestial(environment.sun, sunPos, lightFocus, 820);
  aimDirectionalLightFromCelestial(environment.warm, sunPos, lightFocus, 820);
  aimDirectionalLightFromCelestial(environment.moonLight, moonPos, lightFocus, 820);
  environment.sunDisc.visible = sunPos.y > 5 || !isNight;
  environment.moonDisc.visible = moonPos.y > 5 || isNight || sunriseTransition > 0.15;

  environment.sun.intensity = 0.18 + dayAmount * 2.25 + twilight * 0.35;
  environment.hemi.intensity = 0.18 + dayAmount * 1.18;
  environment.warm.intensity = 0.04 + twilight * 1.35;
  environment.moonLight.intensity = nightFactor * 0.78;
  renderer.toneMappingExposure = 0.48 + dayAmount * 0.7 + twilight * 0.16;

  environment.sun.color.setHex(twilight > 0.05 ? 0xffe0a3 : 0xffffff);
  environment.warm.color.setHex(0xffca70);
  environment.moonLight.color.setHex(0xb8ccff);
  environment.sunDisc.material.color.setHex(twilight > 0.05 ? 0xffde8a : 0xfff1a6);
  environment.moonDisc.material.color.setHex(0xdfe9ff);
  const sky = new THREE.Color(0x8edff0)
    .lerp(new THREE.Color(0xffd27a), twilight * 0.66)
    .lerp(new THREE.Color(0x07111d), nightFactor * 0.9);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);
  scene.fog.near = 185 + dayAmount * 55;
  scene.fog.far = 520 + dayAmount * 460;
  mats.water.color.copy(new THREE.Color(0x35b7d4).lerp(new THREE.Color(0x0b2433), nightFactor * 0.84));
  mats.shallows.color.copy(new THREE.Color(0x6ed7cf).lerp(new THREE.Color(0x123444), nightFactor * 0.72));
  updateShipNightLights(clamp((0.72 - dayAmount) / 0.52, 0, 1));
  environment.phase = isNight ? "night" : twilight > 0.1 ? (sunriseWarmth >= sunsetWarmth ? "sunrise" : "sunset") : "day";
}

function addSea() {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE, 104, 104), mats.water);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  sea.userData.wave = true;
  scene.add(sea);
  const grid = new THREE.GridHelper(SEA_SIZE, 76, 0x87e7f3, 0x87e7f3);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.08;
  scene.add(grid);
  const foamLimit = WATERFALL_LIMIT - 28;
  for (let i = 0; i < 160; i++) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(3 + Math.random() * 8, 0.04, 0.14), mat(0xd9fbff));
    foam.position.set((Math.random() - 0.5) * foamLimit * 2, 0.035, (Math.random() - 0.5) * foamLimit * 2);
    foam.rotation.y = Math.random() * Math.PI;
    foam.userData.drift = Math.random() * 100;
    scene.add(foam);
    seaDriftObjects.push(foam);
  }
  addWorldWaterfall();
}

function addWorldWaterfall() {
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.72, depthWrite: false });
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const makeEdge = (x, z, width, rot, sideX, sideZ) => {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 6.6), foamMat.clone());
    foam.position.set(x - sideX * 1.8, 0.09, z - sideZ * 1.8);
    foam.rotation.y = rot;
    foam.userData.waterfallFoam = true;
    scene.add(foam);
    waterfallFoamObjects.push(foam);
    for (let i = 0; i < 18; i++) {
      const mist = new THREE.Mesh(new THREE.PlaneGeometry(16 + Math.random() * 30, 12 + Math.random() * 20), mistMat.clone());
      const along = (Math.random() - 0.5) * width;
      mist.position.set(x + (sideZ ? along : sideX * 5.8), -8 - Math.random() * 26, z + (sideX ? along : sideZ * 5.8));
      mist.rotation.y = rot;
      mist.userData.waterfallMist = Math.random() * 100;
      scene.add(mist);
      waterfallMistObjects.push(mist);
    }
  };
  makeEdge(0, WATERFALL_LIMIT, WATERFALL_LIMIT * 2, 0, 0, 1);
  makeEdge(0, -WATERFALL_LIMIT, WATERFALL_LIMIT * 2, Math.PI, 0, -1);
  makeEdge(WATERFALL_LIMIT, 0, WATERFALL_LIMIT * 2, Math.PI / 2, 1, 0);
  makeEdge(-WATERFALL_LIMIT, 0, WATERFALL_LIMIT * 2, -Math.PI / 2, -1, 0);
  addHiddenForgeWaterfall();
}

function addHiddenForgeWaterfall() {
  const group = new THREE.Group();
  group.position.set(FORGE_WATERFALL.x, 0, FORGE_WATERFALL.z);
  group.visible = false;
  group.rotation.y = Math.atan2(FORGE_WATERFALL.x - FORGE_WORLD.x, FORGE_WATERFALL.z - FORGE_WORLD.z);
  const fallTopY = FORGE_ELEVATION + 3.0;
  const fallBottomY = 0.15;
  const fallHeight = fallTopY - fallBottomY;
  group.userData.forgeFallTopY = fallTopY;
  group.userData.forgeFallHeight = fallHeight;
  const sheetMat = new THREE.MeshBasicMaterial({ color: 0xc9fbff, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(20, fallHeight, 12, 16), sheetMat);
  sheet.position.y = fallBottomY + fallHeight * 0.5;
  group.add(sheet);
  const brightRibbonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
  for (const x of [-6.4, -2.2, 3.4, 7.1]) {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(1.4, fallHeight - 1.4, 2, 10), brightRibbonMat.clone());
    ribbon.position.set(x, fallBottomY + fallHeight * 0.5, 0.04);
    ribbon.userData.forgeRibbon = Math.random() * 10;
    ribbon.userData.baseX = x;
    ribbon.userData.baseY = fallBottomY + fallHeight * 0.5;
    group.add(ribbon);
  }
  const topLip = new THREE.Mesh(new THREE.BoxGeometry(22, 0.12, 3.2), new THREE.MeshBasicMaterial({ color: 0xe8fdff, transparent: true, opacity: 0.76, depthWrite: false }));
  topLip.position.y = fallTopY - 0.04;
  topLip.position.z = -0.7;
  group.add(topLip);
  const foam = new THREE.Mesh(new THREE.RingGeometry(6.5, 13.5, 48), new THREE.MeshBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.12;
  group.add(foam);
  for (let i = 0; i < 10; i++) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(5 + Math.random() * 8, 4 + Math.random() * 7), new THREE.MeshBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    mist.position.set((Math.random() - 0.5) * 20, 2 + Math.random() * (fallTopY - 2), (Math.random() - 0.5) * 3.5);
    mist.rotation.y = Math.random() * Math.PI;
    mist.userData.forgeMist = Math.random() * 100;
    group.add(mist);
  }
  scene.add(group);
  hiddenForgeWaterfallObjects.push(group);
}

function initCompassTrail() {
  if (compassTrailGroup) return;
  compassTrailGroup = new THREE.Group();
  compassTrailGroup.visible = false;
  const material = new THREE.MeshBasicMaterial({
    color: 0xf7fbff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  for (let i = 0; i < COMPASS_TRAIL_SEGMENTS; i++) {
    const segment = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material.clone());
    segment.rotation.x = -Math.PI / 2;
    segment.renderOrder = 4;
    segment.userData.phase = i / COMPASS_TRAIL_SEGMENTS;
    compassTrailGroup.add(segment);
    compassTrailSegments.push(segment);
  }
  const endRing = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 6.4, 42),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.58, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  endRing.rotation.x = -Math.PI / 2;
  endRing.position.set(FORGE_WATERFALL.x, 0.055, FORGE_WATERFALL.z);
  endRing.renderOrder = 5;
  endRing.userData.compassTrailEnd = true;
  compassTrailGroup.add(endRing);
  scene.add(compassTrailGroup);
}

function makeCloud() {
  const cloud = new THREE.Group();
  const softMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
  const wispMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  for (let i = 0; i < 8; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), i < 3 ? shadeMat : softMat);
    puff.scale.set(4.2 + Math.random() * 3.4, 0.65 + Math.random() * 0.42, 1.55 + Math.random() * 1.65);
    puff.position.set(i * 2.35 + (Math.random() - 0.5) * 1.9, Math.random() * 0.75, (Math.random() - 0.5) * 3.7);
    puff.rotation.set((Math.random() - 0.5) * 0.08, Math.random() * Math.PI, (Math.random() - 0.5) * 0.12);
    cloud.add(puff);
  }
  for (let i = 0; i < 5; i++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(8 + Math.random() * 8, 1.1 + Math.random() * 0.9), wispMat.clone());
    sheet.material.opacity = 1;
    sheet.position.set(2.5 + i * 3.2 + (Math.random() - 0.5) * 2.2, -0.45 + Math.random() * 0.6, (Math.random() - 0.5) * 4.8);
    sheet.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI, (Math.random() - 0.5) * 0.08);
    cloud.add(sheet);
  }
  cloud.scale.set(1.3 + Math.random() * 1.25, 1, 1.05 + Math.random() * 0.55);
  cloud.position.set((Math.random() - 0.5) * SEA_SIZE * 0.72, 42 + Math.random() * 18, (Math.random() - 0.5) * SEA_SIZE * 0.72);
  cloud.userData.cloud = 0.7 + Math.random() * 0.9;
  scene.add(cloud);
  cloudObjects.push(cloud);
}

function makePalm() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4.5, 6), mat(0x9b6b35));
  trunk.position.y = 2.2;
  trunk.rotation.z = 0.14;
  trunk.castShadow = true;
  tree.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.2, 4), mat(0x2f9e64));
    leaf.position.set(Math.cos(i * 1.26) * 1.25, 4.65, Math.sin(i * 1.26) * 1.25);
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = i * 1.26;
    leaf.castShadow = true;
    tree.add(leaf);
  }
  return tree;
}

function makePine() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 3.6, 6), mat(0x7a5030));
  trunk.position.y = 1.8;
  trunk.castShadow = true;
  tree.add(trunk);
  for (let i = 0; i < 3; i++) {
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.45 - i * 0.22, 2.35, 7), mat(i % 2 ? 0x2f6b48 : 0x24543c));
    foliage.position.y = 3.0 + i * 0.85;
    foliage.castShadow = true;
    tree.add(foliage);
  }
  return tree;
}

function makeBroadleafTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 3.2, 6), mat(0x8b5a32));
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  tree.add(trunk);
  const crownMat = mat(Math.random() < 0.5 ? 0x3c8b4f : 0x4f9b58);
  for (let i = 0; i < 4; i++) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.05 + Math.random() * 0.25, 9, 7), crownMat);
    crown.position.set((Math.random() - 0.5) * 1.25, 3.35 + Math.random() * 0.55, (Math.random() - 0.5) * 1.25);
    crown.scale.y = 0.85;
    crown.castShadow = true;
    tree.add(crown);
  }
  return tree;
}

function makeIslandTree(theme) {
  if (["norse", "rocky", "naval", "fort"].includes(theme)) return Math.random() < 0.68 ? makePine() : makeBroadleafTree();
  if (["iberian", "trade", "starter", "schooner"].includes(theme)) return Math.random() < 0.55 ? makeBroadleafTree() : makePalm();
  if (["atoll", "lagoon", "dhow", "market"].includes(theme)) return Math.random() < 0.78 ? makePalm() : makeBroadleafTree();
  return Math.random() < 0.45 ? makePalm() : makeBroadleafTree();
}

function makeForgeIsland(data, group, radius, accent) {
  const elevation = FORGE_ELEVATION;
  group.position.set(data.x, elevation, data.z);
  const landY = elevation + 2.9;
  const obstacles = [];
  const collisionBoxes = [];
  const terrainFeatures = [];
  const walkPlatforms = [];
  const surfaceLobes = [
    { x: 0, z: 0, rx: radius * 0.76, rz: radius * 0.68, rot: 0.06 },
    { x: -radius * 0.22, z: radius * 0.1, rx: radius * 0.36, rz: radius * 0.34, rot: -0.34 },
    { x: radius * 0.2, z: -radius * 0.12, rx: radius * 0.34, rz: radius * 0.32, rot: 0.42 },
    { x: -radius * 0.18, z: -radius * 0.5, rx: radius * 0.26, rz: radius * 0.22, rot: 0.08 },
    { x: -radius * 0.22, z: -radius * 0.64, rx: radius * 0.26, rz: radius * 0.2, rot: 0.1 },
  ];
  const addCollisionBox = (x, z, w, d, pad = 0.08, rot = 0, options = {}) => {
    collisionBoxes.push({ x: data.x + x, z: data.z + z, w, d, pad, rot, ...options });
  };
  const addWalkPlatform = (x, z, w, d, y, rot = 0, options = {}) => {
    walkPlatforms.push({ x: data.x + x, z: data.z + z, w, d, y, rot, ...options });
  };
  const addForgePiece = (mesh, x, y, z, parent = group) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const undersideGeo = new THREE.ConeGeometry(radius * 0.72, elevation * 0.72, 11, 6);
  const undersidePos = undersideGeo.attributes.position;
  for (let i = 0; i < undersidePos.count; i++) {
    const x = undersidePos.getX(i);
    const y = undersidePos.getY(i);
    const z = undersidePos.getZ(i);
    const angle = Math.atan2(z, x);
    const vertical = clamp((y + elevation * 0.36) / (elevation * 0.72), 0, 1);
    const ridge = 1 + Math.sin(angle * 5.1 + vertical * 1.7) * 0.11 + Math.cos(angle * 8.4 - vertical * 2.3) * 0.07;
    const taperNoise = 1 + (1 - vertical) * Math.sin(angle * 13.2) * 0.045;
    undersidePos.setX(i, x * ridge * taperNoise);
    undersidePos.setZ(i, z * (1 + Math.cos(angle * 4.2 + vertical * 3.6) * 0.09));
  }
  undersideGeo.computeVertexNormals();
  const underside = new THREE.Mesh(undersideGeo, mat(0x6e6b58));
  underside.position.y = -elevation * 0.34;
  underside.rotation.x = Math.PI;
  underside.rotation.y = 0.2;
  underside.scale.z = 0.78;
  underside.castShadow = true;
  group.add(underside);
  const forgeGrassMat = new THREE.MeshStandardMaterial({ color: 0x78c85d, emissive: 0x123b12, emissiveIntensity: 0.1, roughness: 0.82, metalness: 0.01 });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x315f25, emissive: 0x0c2608, emissiveIntensity: 0.12, roughness: 0.9, metalness: 0 });
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.78, 1.0, 20), mats.sand);
  sand.position.y = 1.55;
  sand.scale.z = 1.0;
  sand.castShadow = true;
  sand.receiveShadow = true;
  group.add(sand);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.56, radius * 0.66, 0.88, 22), forgeGrassMat);
  grass.position.y = 2.45;
  grass.scale.z = 1.08;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.08;
    const edgeX = Math.cos(angle) * radius * (0.5 + (i % 4) * 0.025);
    const edgeZ = Math.sin(angle) * radius * (0.52 + (i % 5) * 0.018) * 1.02;
    const start = new THREE.Vector3(edgeX, 2.85 - (i % 2) * 0.12, edgeZ);
    const end = new THREE.Vector3(
      edgeX + Math.cos(angle + 0.6) * (0.45 + (i % 3) * 0.2),
      -1.2 - (i % 5) * 0.82,
      edgeZ + Math.sin(angle + 0.6) * (0.45 + (i % 4) * 0.18)
    );
    const vine = addRope(group, start, end, 1, 0.045 + (i % 3) * 0.008, vineMat);
    vine.castShadow = true;
  }
  const glowGold = new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffb000, emissiveIntensity: 1.25, roughness: 0.45, metalness: 0.05 });
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcf43, emissiveIntensity: 2.2, roughness: 0.25, metalness: 0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xf8f8ee, roughness: 0.82, metalness: 0.01 });
  const leafGlowMat = new THREE.MeshStandardMaterial({ color: 0xffde7a, emissive: 0xffb000, emissiveIntensity: 1.05, roughness: 0.58, metalness: 0.02 });
  const runeMat = new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffb000, emissiveIntensity: 1.35, roughness: 0.54, metalness: 0.02, side: THREE.DoubleSide });
  const forgeWaterMat = new THREE.MeshStandardMaterial({ color: 0x79e8f2, roughness: 0.22, metalness: 0.02, transparent: true, opacity: 0.82 });
  const waterfallLocal = { x: FORGE_WATERFALL.x - data.x, z: FORGE_WATERFALL.z - data.z };
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 34), forgeWaterMat);
  pond.scale.set(radius * 0.085, 1, radius * 0.058);
  pond.position.set(waterfallLocal.x * 0.42, 3.03, waterfallLocal.z * 0.42);
  pond.receiveShadow = true;
  group.add(pond);
  const streamStart = new THREE.Vector3(pond.position.x, 3.085, pond.position.z);
  const streamEnd = new THREE.Vector3(waterfallLocal.x, 3.09, waterfallLocal.z + 6);
  const streamMid = streamStart.clone().add(streamEnd).multiplyScalar(0.5);
  const streamLength = streamStart.distanceTo(streamEnd);
  const stream = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.2, streamLength), forgeWaterMat.clone());
  stream.position.copy(streamMid);
  stream.rotation.y = Math.atan2(streamEnd.x - streamStart.x, streamEnd.z - streamStart.z);
  group.add(stream);
  const waterfallLip = new THREE.Mesh(new THREE.BoxGeometry(12, 0.18, 4), forgeWaterMat.clone());
  waterfallLip.position.set(waterfallLocal.x, 3.1, waterfallLocal.z + 2.5);
  waterfallLip.rotation.y = stream.rotation.y;
  group.add(waterfallLip);
  const waterfallInward = new THREE.Vector3(-waterfallLocal.x, 0, -waterfallLocal.z);
  if (waterfallInward.lengthSq() < 0.01) waterfallInward.set(0, 0, 1);
  waterfallInward.normalize();
  const landingLocal = new THREE.Vector3(waterfallLocal.x, 0, waterfallLocal.z).add(waterfallInward.clone().multiplyScalar(6));
  const landingRot = Math.atan2(-waterfallLocal.x, -waterfallLocal.z) + Math.PI / 2;
  surfaceLobes.push({ x: landingLocal.x, z: landingLocal.z, rx: 12.2, rz: 8.6, rot: landingRot });
  addWalkPlatform(landingLocal.x, landingLocal.z, 18.5, 12.5, landY + 0.08, landingRot, { maxRise: 1.15 });

  function forgeSurfaceLocalY(x, z) {
    let y = null;
    surfaceLobes.forEach((lobe, index) => {
      const dx = x - lobe.x;
      const dz = z - lobe.z;
      const rot = lobe.rot || 0;
      const cos = Math.cos(-rot);
      const sin = Math.sin(-rot);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      const normalized = (localX * localX) / (lobe.rx * lobe.rx) + (localZ * localZ) / (lobe.rz * lobe.rz);
      if (normalized > 1) return;
      const lobeEdge = Math.sqrt(normalized);
      const edgeSlope = clamp((lobeEdge - 0.76) / 0.22, 0, 1);
      const lobeY = 2.9 + index * 0.035 - edgeSlope * 0.48;
      y = y === null ? lobeY : Math.max(y, lobeY);
    });
    return y ?? 2.9;
  }

  function makeForgeOak() {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.58, 4.6, 7), mat(0x7b5733));
    trunk.position.y = 2.3;
    trunk.castShadow = true;
    tree.add(trunk);
    for (let i = 0; i < 5; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.19, 2.4, 6), mat(0x6b482a));
      branch.position.set(Math.cos(i * 1.26) * 0.55, 3.35 + (i % 2) * 0.22, Math.sin(i * 1.26) * 0.55);
      branch.rotation.z = Math.PI / 2.6;
      branch.rotation.y = i * 1.26;
      branch.castShadow = true;
      tree.add(branch);
    }
    for (let i = 0; i < 7; i++) {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.35 - (i % 3) * 0.08, 10, 7), i % 3 === 0 ? leafGlowMat : leafMat);
      crown.position.set(Math.cos(i * 0.9) * (0.6 + (i % 2) * 0.6), 4.45 + Math.sin(i) * 0.28, Math.sin(i * 1.12) * (0.55 + (i % 3) * 0.35));
      crown.scale.set(1.1, 0.7, 1);
      crown.castShadow = true;
      tree.add(crown);
    }
    return tree;
  }

  function makeGoldTableFurniture(kind) {
    const piece = new THREE.Group();
    const darkGold = new THREE.MeshStandardMaterial({ color: 0x9e6a20, emissive: 0x5d3600, emissiveIntensity: 0.28, roughness: 0.5, metalness: 0.2 });
    if (kind === "throne") {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.72), glowGold);
      seat.position.y = 0.09;
      piece.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.9, 0.16), glowGold);
      back.position.set(0, 0.54, 0.31);
      piece.add(back);
      for (const x of [-0.34, 0.34]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.72), darkGold);
        arm.position.set(x, 0.31, 0);
        piece.add(arm);
      }
    } else if (kind === "chest") {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.42, 0.72), darkGold);
      base.position.y = 0.21;
      piece.add(base);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 1.12, 12, 1, false, 0, Math.PI), glowGold);
      lid.rotation.z = Math.PI / 2;
      lid.position.y = 0.46;
      piece.add(lid);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.78), glowGold);
      band.position.y = 0.25;
      piece.add(band);
    } else if (kind === "candelabra") {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.78, 8), glowGold);
      stem.position.y = 0.39;
      piece.add(stem);
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.86, 8), glowGold);
      cross.rotation.z = Math.PI / 2;
      cross.position.y = 0.72;
      piece.add(cross);
      for (const x of [-0.38, 0, 0.38]) {
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), crystalMat);
        flame.position.set(x, 0.92, 0);
        piece.add(flame);
      }
    } else {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 0.22, 18), glowGold);
      bowl.position.y = 0.12;
      piece.add(bowl);
      const gems = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crystalMat);
      gems.position.y = 0.34;
      piece.add(gems);
    }
    piece.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return piece;
  }

  const castle = new THREE.Group();
  const castleW = 34;
  const castleD = 26;
  const castleZ = radius * 0.11;
  const baseY = 2.94;
  const wallH = 7.2;
  const paleStone = mat(0xf4ecd4);
  const paleGold = mat(0xf3df9a);
  const warmWhite = mat(0xfff6df);
  const dark = mat(0x4b3926);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xf6fdff, emissive: 0xffd36a, emissiveIntensity: 0.7, roughness: 0.38, metalness: 0.03 });
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW, 0.26, castleD), paleGold), 0, baseY, 0, castle);
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW, wallH, 0.55), warmWhite), 0, baseY + wallH * 0.5, castleD * 0.5, castle);
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.55, wallH, castleD), warmWhite), -castleW * 0.5, baseY + wallH * 0.5, 0, castle);
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.55, wallH, castleD), warmWhite), castleW * 0.5, baseY + wallH * 0.5, 0, castle);
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, wallH, 0.55), warmWhite), -castleW * 0.34, baseY + wallH * 0.5, -castleD * 0.5, castle);
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, wallH, 0.55), warmWhite), castleW * 0.34, baseY + wallH * 0.5, -castleD * 0.5, castle);
  const gateZ = -castleD * 0.5 - 0.36;
  for (const side of [-1, 1]) {
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(1.25, wallH * 0.92, 1.05), warmWhite), side * 3.35, baseY + wallH * 0.46, gateZ, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(2.7, wallH * 0.94, 1.05), warmWhite), side * 4.85, baseY + wallH * 0.47, gateZ, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(2.3, wallH, 0.66), warmWhite), side * 4.75, baseY + wallH * 0.5, -castleD * 0.5, castle);
    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(1.75, 3.55, 0.18), glowGold);
    openDoor.rotation.y = side * 0.72;
    addForgePiece(openDoor, side * 1.8, baseY + 1.86, gateZ - 0.25, castle);
    for (const y of [baseY + 1.1, baseY + 1.88, baseY + 2.66]) {
      addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.24), dark), side * 2.43, y, gateZ - 0.52, castle);
    }
  }
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(8.1, 3.55, 1.05), warmWhite), 0, baseY + 5.55, gateZ, castle);
  const gateArch = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.18, 8, 24, Math.PI), glowGold);
  gateArch.rotation.x = Math.PI / 2;
  gateArch.rotation.z = Math.PI;
  addForgePiece(gateArch, 0, baseY + 3.75, gateZ - 0.58, castle);
  for (const x of [-castleW * 0.32, -castleW * 0.17, castleW * 0.17, castleW * 0.32]) {
    const backWindow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.55, 0.08), windowMat);
    addForgePiece(backWindow, x, baseY + 4.3, castleD * 0.5 + 0.31, castle);
  }
  const addSquareSideWindow = (side, z, y = baseY + 4.2) => {
    const x = side * (castleW * 0.5 + 0.315);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 1.15), dark), x, y, z, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.35, 0.08), glowGold), x + side * 0.012, y, z - 0.66, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.35, 0.08), glowGold), x + side * 0.012, y, z + 0.66, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 1.35), glowGold), x + side * 0.012, y - 0.66, z, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 1.35), glowGold), x + side * 0.012, y + 0.66, z, castle);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.82, 0.82), windowMat);
    addForgePiece(glow, x + side * 0.02, y, z, castle);
  };
  for (const side of [-1, 1]) {
    for (const z of [-castleD * 0.3, -castleD * 0.08, castleD * 0.16, castleD * 0.34]) addSquareSideWindow(side, z);
  }
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW + 1.2, 0.16, 0.24), glowGold), 0, baseY + 1.15, castleD * 0.42, castle);
  for (const x of [-castleW * 0.52, castleW * 0.52]) {
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, castleD + 1.0), glowGold), x, baseY + 1.15, 0, castle);
  }
  addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW + 2.4, 0.42, castleD + 2.4), paleStone), 0, baseY + wallH + 0.28, 0, castle);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(castleW * 0.43, 4.2, 4), paleGold);
  roof.rotation.y = Math.PI / 4;
  addForgePiece(roof, 0, baseY + wallH + 2.35, 0, castle);
  const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 4.3, 1.0, 28), glowGold);
  addForgePiece(roofCap, 0, baseY + wallH + 4.55, 0, castle);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.35, 24, 12), glowGold);
  dome.scale.y = 0.62;
  addForgePiece(dome, 0, baseY + wallH + 5.15, 0, castle);
  addForgePiece(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 10), dark), 0, baseY + wallH + 6.5, 0, castle);
  addForgePiece(new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), glowGold), 0, baseY + wallH + 7.68, 0, castle);

  for (const x of [-castleW * 0.32, -castleW * 0.12, castleW * 0.12, castleW * 0.32]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, wallH * 0.88, 10), paleStone);
    addForgePiece(pillar, x, baseY + wallH * 0.44, -castleD * 0.5 - 0.28, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH * 0.82, 0.12), glowGold), x, baseY + wallH * 0.45, -castleD * 0.5 - 0.84, castle);
  }
  for (const x of [-castleW * 0.46, castleW * 0.46]) {
    for (const z of [-castleD * 0.25, castleD * 0.25]) {
      addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.18, wallH * 0.72, 0.16), glowGold), x, baseY + wallH * 0.44, z, castle);
    }
  }
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, castleD * 0.72), mat(0x59302d));
  addForgePiece(carpet, 0, baseY + 0.18, -castleD * 0.05, castle);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 1.3, 14), glowGold);
  addForgePiece(pedestal, 0, baseY + 0.84, castleD * 0.18, castle);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 0), crystalMat);
  addForgePiece(crystal, 0, baseY + 3.06, castleD * 0.18, castle);
  crystal.userData.forgeCrystalBase = crystal.position.y;
  crystal.userData.forgeCrystalPhase = Math.random() * Math.PI * 2;
  forgeAnimatedObjects.push(crystal);
  for (let i = 0; i < 14; i++) {
    const particle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 + (i % 3) * 0.015, 0), glowGold);
    particle.userData.forgeParticle = true;
    particle.userData.phase = i / 14;
    particle.userData.radius = 0.26 + (i % 4) * 0.08;
    particle.userData.topY = baseY + 2.94;
    particle.userData.drop = 1.85;
    particle.userData.centerZ = castleD * 0.18;
    castle.add(particle);
    forgeAnimatedObjects.push(particle);
  }
  const pedestalLight = new THREE.PointLight(0xffd36a, 1.6, 48);
  pedestalLight.position.set(0, baseY + 3.18, castleD * 0.18);
  castle.add(pedestalLight);
  for (const z of [-castleD * 0.33, 0, castleD * 0.34]) {
    for (const x of [-castleW * 0.43, castleW * 0.43]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), glowGold);
      addForgePiece(lamp, x, baseY + 4.7, z, castle);
    }
  }
  for (const z of [-castleD * 0.18, castleD * 0.03, castleD * 0.26]) {
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.4), glowGold), -castleW * 0.22, baseY + 0.38, z, castle);
    addForgePiece(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.4), glowGold), castleW * 0.22, baseY + 0.38, z, castle);
  }
  const tableX = castleW * 0.28;
  const tableZ = castleD * 0.08;
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.36, 5.4), glowGold);
  addForgePiece(tableTop, tableX, baseY + 0.62, tableZ, castle);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addForgePiece(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.82, 8), glowGold), tableX + sx * 3.62, baseY + 0.24, tableZ + sz * 2.15, castle);
    }
  }
  const tableFurniturePlacements = [
    ["throne", -2.35, -1.2, -0.38],
    ["candelabra", 2.05, -1.2, 0.12],
    ["chest", -2.05, 1.22, 0.22],
    ["bowl", 2.35, 1.18, -0.2],
  ];
  tableFurniturePlacements.forEach(([kind, x, z, rot]) => {
    const piece = makeGoldTableFurniture(kind);
    piece.position.set(tableX + x, baseY + 0.81, tableZ + z);
    piece.rotation.y = rot;
    piece.scale.setScalar(kind === "candelabra" ? 1.15 : 1.05);
    castle.add(piece);
  });
  castle.position.set(0, 0, castleZ);
  castle.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  group.add(castle);

  for (const x of [-castleW * 0.5 - 2.5, castleW * 0.5 + 2.5]) {
    for (const z of [castleZ - castleD * 0.5 - 2.5, castleZ + castleD * 0.5 + 2.5]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.85, wallH + 3.2, 16), paleStone);
      addForgePiece(tower, x, baseY + (wallH + 3.2) * 0.5, z);
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 3.2, 16), glowGold);
      addForgePiece(towerRoof, x, baseY + wallH + 4.8, z);
      obstacles.push({ x: data.x + x, z: data.z + z, r: 2.2 });
      addCollisionBox(x, z, 4.4, 4.4, 0.04, 0, { maxY: landY + wallH + 5.2, solidWall: true });
    }
  }

  const wallMaxY = landY + wallH + 1.1;
  const wallMinY = landY - 0.55;
  const forgeWallOptions = { minY: wallMinY, maxY: wallMaxY + 0.85, solidWall: true };
  addWalkPlatform(0, castleZ, castleW - 0.15, castleD - 0.15, landY + 0.08, 0, { maxRise: 1.1 });
  addCollisionBox(0, castleZ + castleD * 0.5, castleW + 1.3, 1.85, 0.38, 0, forgeWallOptions);
  addCollisionBox(-castleW * 0.5, castleZ, 1.85, castleD + 1.3, 0.38, 0, forgeWallOptions);
  addCollisionBox(castleW * 0.5, castleZ, 1.85, castleD + 1.3, 0.38, 0, forgeWallOptions);
  addCollisionBox(-castleW * 0.34, castleZ - castleD * 0.5, castleW * 0.4, 1.85, 0.34, 0, forgeWallOptions);
  addCollisionBox(castleW * 0.34, castleZ - castleD * 0.5, castleW * 0.4, 1.85, 0.34, 0, forgeWallOptions);
  addCollisionBox(0, castleZ + gateZ, 8.35, 1.45, 0.18, 0, { minY: landY + 3.05, maxY: wallMaxY + 0.85, solidWall: true });
  for (const side of [-1, 1]) {
    addCollisionBox(side * 3.35, castleZ + gateZ, 1.75, 1.65, 0.32, 0, forgeWallOptions);
    addCollisionBox(side * 4.85, castleZ + gateZ, 3.25, 1.65, 0.32, 0, forgeWallOptions);
    addCollisionBox(side * 4.75, castleZ - castleD * 0.5, 2.85, 1.5, 0.3, 0, forgeWallOptions);
  }
  addCollisionBox(0, castleZ + castleD * 0.18, 3.1, 3.1, 0.06, 0, { minY: landY, maxY: landY + 2.0 });
  addWalkPlatform(tableX, castleZ + tableZ, 8.65, 5.45, landY + 0.84, 0, { maxRise: 1.45 });
  addCollisionBox(tableX, castleZ + tableZ, 8.8, 5.6, 0.14, 0, { minY: landY - 0.2, maxY: landY + 0.98, walkableTopY: landY + 0.8 });
  tableFurniturePlacements.forEach(([kind, x, z]) => {
    const w = kind === "candelabra" ? 1.05 : kind === "chest" ? 1.28 : 1.1;
    const d = kind === "candelabra" ? 0.75 : 1.02;
    addCollisionBox(tableX + x, castleZ + tableZ + z, w, d, 0.08, 0, { minY: landY, maxY: landY + 2.25 });
  });

  for (let i = 0; i < 8; i++) {
    const angle = i * (Math.PI * 2 / 8) + 0.28;
    const x = Math.cos(angle) * radius * 0.53;
    const z = Math.sin(angle) * radius * 0.42;
    if (Math.abs(x) < castleW * 0.75 && Math.abs(z - castleZ) < castleD * 0.9) continue;
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7 + (i % 3) * 0.35, 0), mats.rock);
    boulder.position.set(x, 3.24, z);
    boulder.rotation.set(0.2 + i * 0.17, i * 0.8, -0.12);
    boulder.scale.set(1.25, 0.9, 0.82);
    boulder.castShadow = true;
    group.add(boulder);
    const runeNormal = new THREE.Vector3(x, 0, z);
    if (runeNormal.lengthSq() < 0.01) runeNormal.set(0, 0, 1);
    runeNormal.normalize();
    const runeGroup = new THREE.Group();
    runeGroup.position.set(x + runeNormal.x * 1.62, 4.38, z + runeNormal.z * 1.62);
    runeGroup.rotation.y = Math.atan2(runeNormal.x, runeNormal.z);
    runeGroup.rotation.x = -0.12 + (i % 2) * 0.08;
    for (let r = 0; r < 3; r++) {
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.68 - r * 0.1), runeMat);
      rune.position.set((r - 1) * 0.25, -r * 0.15, 0.025);
      rune.rotation.z = (r - 1) * 0.45;
      runeGroup.add(rune);
      if (r !== 1) {
        const notch = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.32), runeMat);
        notch.position.set((r - 1) * 0.25 + 0.1, -0.08 - r * 0.14, 0.03);
        notch.rotation.z = -0.75;
        runeGroup.add(notch);
      }
    }
    group.add(runeGroup);
    obstacles.push({ x: data.x + x, z: data.z + z, r: 2.1 });
    addCollisionBox(x, z, 3.5, 3.0, 0.08, angle, { maxY: landY + 2.8, solidWall: true });
  }

  const treeSpots = 22;
  for (let i = 0; i < treeSpots; i++) {
    const angle = (i / treeSpots) * Math.PI * 2 + Math.random() * 0.12;
    const distance = radius * (0.4 + Math.random() * 0.18);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance * 0.82;
    if (Math.abs(x) < castleW * 0.72 && Math.abs(z - castleZ) < castleD * 0.82) continue;
    if (Math.hypot(x - waterfallLocal.x, z - waterfallLocal.z) < 11) continue;
    const tree = makeForgeOak();
    tree.position.set(x, forgeSurfaceLocalY(x, z) + 0.01, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.rotation.z = (Math.random() - 0.5) * 0.045;
    tree.scale.setScalar(0.88 + Math.random() * 0.38);
    group.add(tree);
    obstacles.push({ x: data.x + x, z: data.z + z, r: 1.45 * tree.scale.x });
    addCollisionBox(x, z, 1.55 * tree.scale.x, 1.55 * tree.scale.x, 0.18, 0, { maxY: landY + 7.2 * tree.scale.x, solidWall: true });
  }

  const label = makeLabel(islandName(data.name));
  label.position.set(data.x, landY + 15, data.z);
  label.visible = !data.hiddenLabel;
  scene.add(label);
  labels.push(label);
  scene.add(group);
  return {
    ...data,
    group,
    radius,
    landY,
    obstacles,
    collisionBoxes,
    terrainFeatures,
    walkPlatforms,
    surfaceLobes,
    label,
    dock: forgeBaseWaterfallPoint(),
    shop: new THREE.Vector3(data.x, landY, data.z + castleZ + castleD * 0.18),
    forgePedestal: new THREE.Vector3(data.x, landY, data.z + castleZ + castleD * 0.18),
  };
}

function makeIsland(data) {
  const group = new THREE.Group();
  group.position.set(data.x, 0, data.z);
  const radius = (data.radius || 20) * ISLAND_RADIUS_SCALE;
  const accent = data.accent || 0xd64f45;
  if (data.forge) return makeForgeIsland(data, group, radius, accent);
  if (data.exploreOnly) {
    const obstacles = [];
    const collisionBoxes = [];
    const terrainFeatures = [];
    const walkPlatforms = [];
    const smallLandY = data.emptyIsland ? 1.26 : 1.58;
    const lobeHitScale = data.emptyIsland ? 0.84 : 0.92;
    const lobeSpecs = data.lobes || [
      { x: -radius * 0.18, z: -radius * 0.08, rx: radius * 0.58, rz: radius * 0.42, rot: 0.25 },
      { x: radius * 0.22, z: radius * 0.1, rx: radius * 0.42, rz: radius * 0.56, rot: -0.42 },
      { x: -radius * 0.02, z: radius * 0.3, rx: radius * 0.34, rz: radius * 0.26, rot: 0.72 },
    ];
    const surfaceLobes = lobeSpecs.map((lobe) => ({
      ...lobe,
      rx: lobe.rx * lobeHitScale,
      rz: lobe.rz * lobeHitScale,
    }));
    lobeSpecs.forEach((lobe, index) => {
      const sandHeight = data.emptyIsland ? 0.82 : 1.0;
      const grassHeight = data.emptyIsland ? 0.42 : 0.52;
      const sandY = (data.emptyIsland ? 0.45 : 0.58) + index * 0.03;
      const grassY = sandY + sandHeight * 0.5 + grassHeight * 0.5 - 0.02;
      const shallow = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.07, 12), mats.shallows);
      shallow.scale.set(lobe.rx + 5, 1, lobe.rz + 5);
      shallow.position.set(lobe.x, 0.08, lobe.z);
      shallow.rotation.y = lobe.rot;
      shallow.receiveShadow = true;
      group.add(shallow);
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, sandHeight, 10), mats.sand);
      sand.scale.set(lobe.rx, 1, lobe.rz);
      sand.position.set(lobe.x, sandY, lobe.z);
      sand.rotation.y = lobe.rot;
      sand.castShadow = true;
      sand.receiveShadow = true;
      group.add(sand);
      const grass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, grassHeight, 9), mat(index % 2 ? data.color : new THREE.Color(data.color).multiplyScalar(0.88).getHex()));
      grass.scale.set(lobe.rx * 0.72, 1, lobe.rz * 0.72);
      grass.position.set(lobe.x, grassY, lobe.z);
      grass.rotation.y = lobe.rot + 0.18;
      grass.castShadow = true;
      grass.receiveShadow = true;
      group.add(grass);
    });
    if (data.emptyIsland) {
      surfaceLobes.forEach((lobe) => {
        collisionBoxes.push({
          x: data.x + lobe.x,
          z: data.z + lobe.z,
          w: lobe.rx * 1.78,
          d: lobe.rz * 1.78,
          rot: lobe.rot,
          pad: 0,
          maxY: 0.24,
        });
      });
      const label = makeLabel(islandName(data));
      label.visible = shouldShowIslandLabel(data);
      label.position.set(data.x, 8.2, data.z);
      scene.add(label);
      labels.push(label);
      scene.add(group);
      return {
        ...data,
        group,
        radius,
        landY: smallLandY,
        obstacles,
        collisionBoxes,
        terrainFeatures,
        walkPlatforms,
        surfaceLobes,
        label,
        dock: new THREE.Vector3(data.x, 0, data.z + radius * 0.86),
        shop: new THREE.Vector3(data.x, 0, data.z),
      };
    }
    const hillX = -radius * 0.12;
    const hillZ = -radius * 0.08;
    const hillR = radius * 0.22;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hillR, radius * 0.28, 7), mats.rock);
    hill.position.set(hillX, smallLandY + radius * 0.1, hillZ);
    hill.scale.z = 0.72;
    hill.rotation.y = 0.4;
    hill.castShadow = true;
    group.add(hill);
    terrainFeatures.push({ x: data.x + hillX, z: data.z + hillZ, r: hillR, h: radius * 0.2 });
    for (let i = 0; i < 10; i++) {
      const angle = i * 1.65 + Math.random() * 0.25;
      const tree = makeIslandTree(i % 2 ? "rocky" : "atoll");
      tree.position.set(Math.cos(angle) * radius * (0.24 + Math.random() * 0.18), smallLandY + 0.12, Math.sin(angle) * radius * (0.2 + Math.random() * 0.16));
      if (Math.hypot(tree.position.x - hillX, tree.position.z - hillZ) < hillR + 3.2) continue;
      tree.scale.setScalar(0.55 + Math.random() * 0.32);
      group.add(tree);
      obstacles.push({ x: data.x + tree.position.x, z: data.z + tree.position.z, r: 1.1 * tree.scale.x });
    }
    for (let i = 0; i < 7; i++) {
      const rockSize = 0.55 + Math.random() * 0.75;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize, 0), mats.rock);
      rock.position.set((Math.random() - 0.5) * radius * 1.2, 2.05, (Math.random() - 0.5) * radius * 1.05);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.set(0.8 + Math.random() * 0.8, 0.45 + Math.random() * 0.65, 0.8 + Math.random() * 0.8);
      rock.position.y = smallLandY + 0.25 + rockSize * rock.scale.y * 0.42;
      rock.castShadow = true;
      group.add(rock);
      obstacles.push({ x: data.x + rock.position.x, z: data.z + rock.position.z, r: 0.9 * Math.max(rock.scale.x, rock.scale.z) });
    }
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 6), mats.wood);
    marker.position.set(radius * 0.18, 3.5, -radius * 0.22);
    marker.rotation.z = -0.12;
    group.add(marker);
    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.68, 1.2), mat(accent));
    pennant.position.set(radius * 0.2, 4.65, -radius * 0.22);
    group.add(pennant);
    const label = makeLabel(islandName(data.name));
    label.position.set(data.x, 9, data.z);
    scene.add(label);
    labels.push(label);
    scene.add(group);
    return {
      ...data,
      group,
      radius,
      landY: smallLandY,
      obstacles,
      collisionBoxes,
      terrainFeatures,
      walkPlatforms,
      surfaceLobes,
      label,
      dock: new THREE.Vector3(data.x, 0, data.z + radius * 0.82),
      shop: new THREE.Vector3(data.x, 0, data.z),
    };
  }
  const shallows = new THREE.Mesh(new THREE.CylinderGeometry(radius + 7, radius + 10, 0.08, 24), mats.shallows);
  shallows.position.y = 0.08;
  shallows.receiveShadow = true;
  group.add(shallows);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.86, 2.2, 18), mats.sand);
  base.position.y = 0.7;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.44, radius * 0.62, 1.25, 16), mat(data.color));
  grass.position.y = 2.25;
  grass.castShadow = true;
  grass.receiveShadow = true;
  group.add(grass);
  const dockThemeSeed = (data.theme || "starter").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const dockLength = 16 + (dockThemeSeed % 4) * 1.35 + (["naval", "trade"].includes(data.theme) ? 2.4 : 0);
  const dockWidth = 4.8 + (dockThemeSeed % 3) * 0.38 + (data.theme === "naval" ? 0.8 : 0);
  const dockCenterZ = radius - 4;
  const shopLocal = {
    x: -radius * 0.3,
    z: radius * 0.3,
  };
  const mountainLocal = {
    x: -radius * 0.18,
    z: -radius * 0.2,
    r: radius * (data.theme === "rocky" ? 0.37 : 0.3),
  };
  const noTreeZones = [
    { x: shopLocal.x, z: shopLocal.z, r: 7.5 },
    { x: mountainLocal.x, z: mountainLocal.z, r: mountainLocal.r + 5.5 },
  ];
  const reservedBuildZones = [
    { x: shopLocal.x, z: shopLocal.z, r: 4.2 },
  ];
  const clearOfNoTreeZones = (x, z, buffer = 0) => noTreeZones.every((zone) => Math.hypot(x - zone.x, z - zone.z) > zone.r + buffer);
  const dock = new THREE.Mesh(new THREE.BoxGeometry(dockWidth, 0.45, dockLength), mats.wood);
  dock.position.set(0, 1.45, dockCenterZ);
  dock.castShadow = true;
  dock.receiveShadow = true;
  group.add(dock);
  const obstacles = [
    { x: data.x + shopLocal.x, z: data.z + shopLocal.z, r: 3.8 },
  ];
  const collisionBoxes = [
    { x: data.x + shopLocal.x, z: data.z + shopLocal.z, w: 5.8, d: 5.0 },
  ];
  const terrainFeatures = [];
  const walkPlatforms = [];
  const addCollisionBox = (x, z, w, d, pad = 0.45, rot = 0, options = {}) => {
    collisionBoxes.push({ x: data.x + x, z: data.z + z, w, d, pad, rot, ...options });
  };
  const addWalkPlatform = (x, z, w, d, y, rot = 0, options = {}) => {
    walkPlatforms.push({ x: data.x + x, z: data.z + z, w, d, y, rot, ...options });
  };
  const localIslandSurfaceY = (x, z) => {
    const distance = Math.hypot(x, z);
    const edgeSlope = clamp((distance - radius * 0.62) / (radius * 0.34), 0, 1);
    return 2.9 - edgeSlope * 0.82;
  };
  const localFootprintPoints = (x, z, w, d = w) => [
    { x, z },
    { x: x - w * 0.5, z: z - d * 0.5 },
    { x: x + w * 0.5, z: z - d * 0.5 },
    { x: x - w * 0.5, z: z + d * 0.5 },
    { x: x + w * 0.5, z: z + d * 0.5 },
  ];
  const clearOfTerrainFeatures = (x, z, w, d = w) => {
    const points = localFootprintPoints(x, z, w + 2.8, d + 2.8);
    return terrainFeatures.every((feature) => {
      const featureLocal = { x: feature.x - data.x, z: feature.z - data.z };
      const featureClear = points.every((point) => Math.hypot(point.x - featureLocal.x, point.z - featureLocal.z) > feature.r * 1.1);
      const peaksClear = (feature.peaks || []).every((peak) => {
        const peakLocal = { x: peak.x - data.x, z: peak.z - data.z };
        return points.every((point) => Math.hypot(point.x - peakLocal.x, point.z - peakLocal.z) > peak.r * 1.08 + 0.8);
      });
      return featureClear && peaksClear;
    });
  };
  const clearBuildSpot = (x, z, w, d = w) => {
    const footprintRadius = Math.hypot(w, d) * 0.5;
    return localFootprintPoints(x, z, w, d).every((point) => Math.hypot(point.x, point.z) < radius * 0.62)
      && reservedBuildZones.every((zone) => Math.hypot(x - zone.x, z - zone.z) > zone.r + footprintRadius + 1)
      && clearOfTerrainFeatures(x, z, w, d);
  };
  const clearHouseProfile = (profile) => {
    if (clearBuildSpot(profile.x, profile.z, profile.w, profile.d)) return profile;
    const candidates = [
      { x: radius * 0.34, z: radius * 0.18 },
      { x: radius * 0.22, z: radius * 0.34 },
      { x: -radius * 0.34, z: radius * 0.28 },
      { x: radius * 0.42, z: -radius * 0.02 },
      { x: -radius * 0.08, z: radius * 0.42 },
      { x: radius * 0.38, z: radius * 0.28 },
    ];
    const spot = candidates.find((candidate) => clearBuildSpot(candidate.x, candidate.z, profile.w, profile.d));
    return spot ? { ...profile, ...spot } : null;
  };
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 2.2), mat(accent));
  banner.position.set(2.7, 3.45, radius - 6.2);
  banner.castShadow = true;
  group.add(banner);
  [dockCenterZ - 6.2, dockCenterZ - 1.4, dockCenterZ + 3.4].forEach((z) => {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.35, 7), mats.wood);
      post.position.set(side * (dockWidth * 0.36), 0.58, z);
      post.castShadow = true;
      group.add(post);
    }
  });
  for (let i = 0; i < 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(dockWidth + 0.35, 0.08, 0.18), mats.hullDark);
    plank.position.set(0, 1.72, dockCenterZ - dockLength * 0.42 + i * dockLength * 0.21);
    plank.castShadow = true;
    group.add(plank);
  }
  const shop = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3, 4.2), mat(0xd9a45e));
  hut.position.y = 4.1;
  hut.castShadow = true;
  shop.add(hut);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.4, 4), mat(0xbb5844));
  roof.position.y = 6.8;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  shop.add(roof);
  shop.position.set(shopLocal.x, 0, shopLocal.z);
  group.add(shop);
  const addBlock = (x, z, w, h, d, color, y = 3.2, blocks = true) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    block.position.set(x, y + h * 0.5, z);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);
    if (blocks) collisionBoxes.push({ x: data.x + x, z: data.z + z, w, d });
    return block;
  };
  const addCone = (x, z, r, h, color, y = 5.4, sides = 4) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), mat(color));
    cone.position.set(x, y, z);
    cone.rotation.y = Math.PI / sides;
    cone.castShadow = true;
    group.add(cone);
    return cone;
  };
  const addTent = (x, z, color) => {
    const cloth = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 4), mat(color));
    cloth.position.set(x, 3.55, z);
    cloth.rotation.y = Math.PI / 4;
    cloth.castShadow = true;
    group.add(cloth);
    obstacles.push({ x: data.x + x, z: data.z + z, r: 1.6 });
  };
  const addInteriorHouse = (x, z, w, d, color, roofColor = accent, options = {}) => {
    const style = options.style || "standard";
    const tallStyles = new Set(["twoStory", "warehouse", "towerHouse", "villa", "pagodaHouse"]);
    const floors = clamp(options.floors || (tallStyles.has(style) ? 2 : 1), 1, 2);
    const wallH = floors > 1 ? (style === "towerHouse" ? 3.65 : 3.25) : (style === "warehouse" ? 2.45 : 1.9);
    const wallY = 3.12 + wallH * 0.5;
    const roofH = style === "towerHouse" ? 1.45 : style === "pagodaHouse" ? 0.95 : style === "longhouse" || style === "warehouse" ? 1.05 : 1.25;
    const roofY = 3.12 + wallH + roofH * 0.5 - 0.06;
    const windowRows = floors > 1 ? [3.95, 5.18] : [4.3];
    noTreeZones.push({ x, z, r: Math.max(w, d) * 0.78 + 2.4 });
    reservedBuildZones.push({ x, z, r: Math.hypot(w, d) * 0.5 + 0.6 });
    const house = new THREE.Group();
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffbd62,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const glowHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb04a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mats.plank);
    floor.position.y = 3.08;
    floor.receiveShadow = true;
    house.add(floor);
    const wallMat = mat(color);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.22), wallMat);
    back.position.set(0, wallY, -d * 0.5);
    house.add(back);
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, d), wallMat);
      wall.position.set(side * w * 0.5, wallY, 0);
      house.add(wall);
      windowRows.forEach((rowY, rowIndex) => {
        const windowZ = rowIndex % 2 === 0 ? -d * 0.16 : d * 0.16;
        const window = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.08), mats.gold);
        window.position.set(side * (w * 0.5 + 0.02), rowY, windowZ);
        house.add(window);
        const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.46, 0.035), glowMaterial);
        windowGlow.position.set(side * (w * 0.5 + 0.045), rowY, windowZ);
        house.add(windowGlow);
      });
    }
    const leftFront = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, wallH, 0.22), wallMat);
    leftFront.position.set(-w * 0.33, wallY, d * 0.5);
    const rightFront = leftFront.clone();
    rightFront.position.x = w * 0.33;
    house.add(leftFront, rightFront);
    if (floors > 1) {
      const upperWalkY = 4.72;
      const upperFloorY = upperWalkY - 0.06;
      const floorW = w * 0.88;
      const floorD = d * 0.82;
      const hole = { x: -w * 0.28, z: -d * 0.03, w: Math.min(1.35, w * 0.34), d: d * 0.48 };
      const addUpperPanel = (cx, cz, pw, pd) => {
        if (pw <= 0.18 || pd <= 0.18) return;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.12, pd), mats.plank);
        panel.position.set(cx, upperFloorY, cz);
        panel.receiveShadow = true;
        house.add(panel);
        addWalkPlatform(x + cx, z + cz, Math.max(0.35, pw - 0.08), Math.max(0.35, pd - 0.08), upperWalkY, 0, { maxRise: 0.9 });
      };
      const floorMinX = -floorW * 0.5;
      const floorMaxX = floorW * 0.5;
      const floorMinZ = -floorD * 0.5;
      const floorMaxZ = floorD * 0.5;
      const holeMinX = hole.x - hole.w * 0.5;
      const holeMaxX = hole.x + hole.w * 0.5;
      const holeMinZ = hole.z - hole.d * 0.5;
      const holeMaxZ = hole.z + hole.d * 0.5;
      addUpperPanel((floorMinX + holeMinX) * 0.5, 0, holeMinX - floorMinX, floorD);
      addUpperPanel((holeMaxX + floorMaxX) * 0.5, 0, floorMaxX - holeMaxX, floorD);
      addUpperPanel(hole.x, (floorMinZ + holeMinZ) * 0.5, hole.w, holeMinZ - floorMinZ);
      addUpperPanel(hole.x, (holeMaxZ + floorMaxZ) * 0.5, hole.w, floorMaxZ - holeMaxZ);
      for (let i = 0; i < 10; i++) {
        const t = (i + 0.5) / 10;
        const stepX = hole.x;
        const stepZ = d * 0.28 + (-d * 0.34 - d * 0.28) * t;
        const stepY = 3.24 + (upperWalkY - 3.24) * t;
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.16, 0.46), mats.wood);
        step.position.set(stepX, stepY - 0.08, stepZ);
        step.castShadow = true;
        step.receiveShadow = true;
        house.add(step);
        addWalkPlatform(x + stepX, z + stepZ, 1.22, 0.54, stepY, 0, { maxRise: 0.7 });
      }
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(w * 0.64, 0.13, 0.72), mats.plank);
      balcony.position.set(0, 4.78, d * 0.65);
      balcony.castShadow = true;
      house.add(balcony);
      addWalkPlatform(x, z + d * 0.65, w * 0.64, 0.72, 4.86, 0, { maxRise: 0.75 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.12, 0.12), mats.dark);
      rail.position.set(0, 5.05, d * 0.98);
      house.add(rail);
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), mats.dark);
        post.position.set(side * w * 0.32, 4.98, d * 0.98);
        house.add(post);
      }
    }
    if (style === "flat") {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.44, 0.22, d + 0.44), mat(roofColor));
      roof.position.y = roofY;
      roof.castShadow = true;
      house.add(roof);
    } else {
      const sides = style === "towerHouse" ? 6 : 4;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.58, roofH, sides), mat(roofColor));
      roof.position.y = roofY;
      roof.rotation.y = Math.PI / sides;
      if (style === "longhouse" || style === "warehouse") roof.scale.set(1.28, 1, 0.72);
      roof.castShadow = true;
      house.add(roof);
      if (style === "pagodaHouse") {
        for (let i = 0; i < 2; i++) {
          const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2 - i * 0.38, 0.12, d + 1.2 - i * 0.38), mat(roofColor));
          eave.position.y = 4.78 + i * 1.16;
          eave.castShadow = true;
          house.add(eave);
        }
      }
      if (style === "longhouse") {
        const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, w + 0.82, 6), mats.dark);
        ridge.rotation.z = Math.PI / 2;
        ridge.position.y = roofY + roofH * 0.44;
        house.add(ridge);
      }
    }
    if (style === "warehouse") {
      for (const side of [-1, 1]) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.55), mats.crate);
        crate.position.set(side * w * 0.28, 3.36, d * 0.82);
        crate.castShadow = true;
        house.add(crate);
      }
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.32, 0.08), mat(0xd8c28f));
      sign.position.set(0, 4.42, d * 0.56);
      house.add(sign);
    } else if (style === "towerHouse") {
      const lookout = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.78, d * 0.42), mat(new THREE.Color(color).multiplyScalar(0.88).getHex()));
      lookout.position.set(0, roofY - 0.42, 0);
      lookout.castShadow = true;
      house.add(lookout);
    } else if (style === "stilt") {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.86, 6), mats.wood);
          post.position.set(sx * w * 0.36, 2.66, sz * d * 0.34);
          post.castShadow = true;
          house.add(post);
        }
      }
    } else if (style === "villa") {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(w * 0.18, 0.055, 7, 16, Math.PI), mat(roofColor));
      arch.rotation.set(0, Math.PI / 2, 0);
      arch.position.set(0, 4.05, d * 0.62);
      house.add(arch);
    }
    const table = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.22, d * 0.24), mats.wood);
    table.position.set(0.1, 3.35, -d * 0.08);
    house.add(table);
    const interiorLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 7), glowMaterial);
    interiorLamp.position.set(0, Math.min(roofY - roofH * 0.36, 5.75), -d * 0.08);
    house.add(interiorLamp);
    const doorwayLamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 7), glowMaterial);
    doorwayLamp.position.set(0, floors > 1 ? 4.78 : 4.42, d * 0.56);
    house.add(doorwayLamp);
    const interiorGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), glowHaloMaterial);
    interiorGlow.rotation.x = -Math.PI / 2;
    interiorGlow.position.set(0, 3.18, -d * 0.06);
    interiorGlow.scale.set(w * 0.34, d * 0.26, 1);
    house.add(interiorGlow);
    const porchGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), glowHaloMaterial);
    porchGlow.rotation.x = -Math.PI / 2;
    porchGlow.position.set(0, 3.16, d * 0.73);
    porchGlow.scale.set(w * 0.28, d * 0.22, 1);
    house.add(porchGlow);
    house.position.set(x, 0, z);
    house.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    group.add(house);
    shipNightLights.push({
      group: house,
      material: glowMaterial,
      haloMaterial: glowHaloMaterial,
      haloOpacity: 0.2,
      lights: [],
      baseIntensity: 0,
    });
    const wallPad = 0.08;
    const wallOptions = { solidWall: true };
    addCollisionBox(x, z - d * 0.5, w, 0.28, wallPad, 0, wallOptions);
    addCollisionBox(x - w * 0.5, z, 0.28, d, wallPad, 0, wallOptions);
    addCollisionBox(x + w * 0.5, z, 0.28, d, wallPad, 0, wallOptions);
    addCollisionBox(x - w * 0.33, z + d * 0.5, w * 0.34, 0.28, wallPad, 0, wallOptions);
    addCollisionBox(x + w * 0.33, z + d * 0.5, w * 0.34, 0.28, wallPad, 0, wallOptions);
    addWalkPlatform(x, z, Math.max(0.8, w - 0.36), Math.max(0.8, d - 0.36), 3.16, 0, { maxRise: 0.7 });
    return house;
  };
  const addThemeHouse = () => {
    const profiles = {
      norse: { x: radius * 0.15, z: radius * 0.02, w: 7.0, d: 3.35, color: 0x8b5a32, roof: 0x5a3b25, chimney: false, style: "longhouse" },
      pagoda: { x: radius * 0.18, z: radius * 0.02, w: 4.25, d: 4.05, color: 0xd9a45e, roof: 0xd99928, chimney: false, style: "pagodaHouse", floors: 2 },
      iberian: { x: radius * 0.16, z: radius * 0.04, w: 4.8, d: 3.65, color: 0xf4e5c9, roof: 0xb84f44, chimney: true, style: "villa", floors: 2 },
      fort: { x: radius * 0.16, z: radius * 0.02, w: 4.75, d: 3.75, color: 0x9b9a87, roof: 0x4f5963, chimney: false, style: "towerHouse", floors: 2 },
      naval: { x: radius * 0.17, z: radius * 0.02, w: 5.45, d: 3.55, color: 0xd8d2bd, roof: 0x4051a8, chimney: true, style: "twoStory", floors: 2 },
      trade: { x: radius * 0.18, z: radius * 0.02, w: 6.35, d: 3.65, color: 0xb77b42, roof: 0x7a5030, chimney: true, style: "warehouse", floors: 2 },
      lagoon: { x: radius * 0.18, z: radius * 0.04, w: 4.4, d: 3.25, color: 0xe2d0a5, roof: 0xd7b44a, chimney: false, style: "stilt" },
      atoll: { x: radius * 0.18, z: radius * 0.04, w: 3.8, d: 3.1, color: 0xefc27c, roof: 0xef6f4f, chimney: false, style: "cottage" },
      rocky: { x: radius * 0.17, z: radius * 0.02, w: 4.4, d: 3.45, color: 0x9b8b78, roof: 0x5b6268, chimney: true, style: "twoStory", floors: 2 },
    };
    const profile = clearHouseProfile({ ...(profiles[data.theme] || { x: radius * 0.18, z: radius * 0.03, w: 4.0, d: 3.2, color: 0xd9a45e, roof: accent, chimney: false, style: "standard" }) });
    if (!profile) return null;
    const house = addInteriorHouse(profile.x, profile.z, profile.w, profile.d, profile.color, profile.roof, {
      style: profile.style,
      floors: profile.floors,
    });
    if (profile.chimney) {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 0.42), mat(0x5a3b25));
      chimney.position.set(profile.x + profile.w * 0.28, 5.75, profile.z - profile.d * 0.25);
      chimney.castShadow = true;
      group.add(chimney);
    }
    if (data.theme === "pagoda" && profile.style !== "pagodaHouse") {
      for (let i = 0; i < 2; i++) {
        const eave = new THREE.Mesh(new THREE.BoxGeometry(profile.w + 1.2 - i * 0.5, 0.12, profile.d + 1.2 - i * 0.5), mat(profile.roof));
        eave.position.set(profile.x, 5.05 + i * 0.46, profile.z);
        eave.castShadow = true;
        group.add(eave);
      }
    }
    if (data.theme === "norse" && profile.style !== "longhouse") {
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, profile.w + 0.7, 6), mats.dark);
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(profile.x, 5.75, profile.z);
      group.add(ridge);
    }
    return house;
  };
  const addMountain = (x, z, r, h, color = 0x66706e) => {
    const mountain = new THREE.Group();
    const peakProfiles = [];
    const makePeak = (px, pz, pr, ph, tint, yaw = 0, snow = false) => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(pr, ph, 7, 1), mat(tint));
      peak.position.set(px, 3 + ph * 0.5, pz);
      peak.scale.z = 0.78 + Math.random() * 0.22;
      peak.rotation.set(0.06, yaw, -0.04);
      peak.castShadow = true;
      peak.receiveShadow = true;
      mountain.add(peak);
      peakProfiles.push({ x: px, z: pz, r: pr, h: ph });
      if (snow) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(pr * 0.34, ph * 0.24, 6, 1), mat(0xd9e4df));
        cap.position.set(px - pr * 0.06, 3 + ph * 0.88, pz - pr * 0.04);
        cap.scale.z = peak.scale.z;
        cap.rotation.copy(peak.rotation);
        cap.castShadow = true;
        mountain.add(cap);
      }
    };
    const baseColor = color;
    const shadowColor = new THREE.Color(color).multiplyScalar(0.78).getHex();
    makePeak(0, 0, r * 1.18, h * 1.55, baseColor, Math.random() * Math.PI, true);
    makePeak(-r * 0.34, r * 0.14, r * 0.74, h * 1.06, shadowColor, Math.random() * Math.PI, false);
    makePeak(r * 0.35, -r * 0.1, r * 0.68, h * 0.96, baseColor, Math.random() * Math.PI, false);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.22;
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(r * 0.085, h * 0.86, 3), mat(i % 2 ? shadowColor : baseColor));
      ridge.position.set(Math.cos(angle) * r * 0.34, 3 + h * 0.48, Math.sin(angle) * r * 0.28);
      ridge.rotation.set(0.82, -angle, 0.2);
      ridge.castShadow = true;
      mountain.add(ridge);
    }
    const foothill = new THREE.Mesh(new THREE.ConeGeometry(r * 1.45, h * 0.38, 9, 1), mat(shadowColor));
    foothill.position.y = 3 + h * 0.18;
    foothill.scale.z = 0.68;
    foothill.rotation.y = Math.random() * Math.PI;
    foothill.receiveShadow = true;
    mountain.add(foothill);
    mountain.position.set(x, 0, z);
    group.add(mountain);
    terrainFeatures.push({
      x: data.x + x,
      z: data.z + z,
      r: r * 1.32,
      h: h * 1.05,
      peaks: peakProfiles.map((peak) => ({
        x: data.x + x + peak.x,
        z: data.z + z + peak.z,
        r: peak.r,
        h: peak.h,
      })),
    });
  };
  const addShipwreck = (angle, type = "galleon") => {
    const wreck = new THREE.Group();
    const wreckLength = type === "frigate" ? 10.4 : 9.2;
    const wreckWidth = type === "frigate" ? 3.6 : 3.2;
    const shoreDistance = radius * 0.72;
    const x = Math.sin(angle) * shoreDistance;
    const z = Math.cos(angle) * shoreDistance;
    const yaw = angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
    const wreckWood = mat(0x5a3522);
    const wetWood = mat(0x39261c);
    const paleWood = mat(0x8c623f);
    const makePiece = (w, h, d, px, py, pz, material = wreckWood, rot = [0, 0, 0]) => {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      piece.position.set(px, py, pz);
      piece.rotation.set(rot[0], rot[1], rot[2]);
      piece.castShadow = true;
      piece.receiveShadow = true;
      wreck.add(piece);
      return piece;
    };
    makePiece(wreckWidth * 0.42, 0.34, wreckLength * 0.96, -wreckWidth * 0.56, 0.38, -0.2, wreckWood, [0.08, 0.04, -0.38]);
    makePiece(wreckWidth * 0.36, 0.32, wreckLength * 0.72, wreckWidth * 0.52, 0.34, -0.7, wetWood, [-0.02, -0.14, 0.46]);
    makePiece(wreckWidth * 0.58, 0.28, wreckLength * 0.52, 0.1, 0.18, -0.52, paleWood, [0.04, 0.02, 0.03]);
    makePiece(wreckWidth * 0.78, 0.46, 1.5, -0.4, 0.55, wreckLength * 0.42, wetWood, [0.16, 0.18, -0.12]);
    makePiece(wreckWidth * 0.62, 0.38, 1.3, 0.68, 0.42, -wreckLength * 0.48, wreckWood, [-0.2, -0.22, 0.18]);
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(wreckWidth * (0.48 + i * 0.015), 0.045, 6, 12, Math.PI), paleWood);
      rib.position.set((i - 2) * 0.18, 0.74, -wreckLength * 0.34 + i * wreckLength * 0.16);
      rib.rotation.set(Math.PI / 2, 0.18 * (i - 2), Math.PI * 0.5 + (i % 2 ? 0.18 : -0.14));
      rib.scale.y = 0.78;
      rib.castShadow = true;
      wreck.add(rib);
    }
    makePiece(0.22, 0.22, wreckLength * 0.72, 0.9, 0.78, -0.12, wetWood, [1.42, 0.32, -0.28]);
    makePiece(0.16, 0.16, wreckLength * 0.34, -1.42, 0.62, -0.98, paleWood, [1.22, -0.52, 0.36]);
    for (let i = 0; i < 7; i++) {
      const px = (Math.random() - 0.5) * wreckWidth * 2.2;
      const pz = (Math.random() - 0.5) * wreckLength * 1.1;
      makePiece(0.22 + Math.random() * 0.18, 0.12, 1.2 + Math.random() * 1.9, px, 0.12 + Math.random() * 0.3, pz, i % 2 ? wetWood : paleWood, [Math.random() * 0.24, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3]);
    }
    wreck.position.set(x, 2.35, z);
    wreck.rotation.set(-0.04, yaw, 0.08);
    group.add(wreck);
    const worldX = data.x + x;
    const worldZ = data.z + z;
    obstacles.push({ x: worldX - Math.sin(yaw) * 2.4, z: worldZ - Math.cos(yaw) * 2.4, r: 1.15 });
    obstacles.push({ x: worldX + Math.sin(yaw) * 2.1, z: worldZ + Math.cos(yaw) * 2.1, r: 1.0 });
    addCollisionBox(x, z, wreckWidth * 0.9, wreckLength * 0.42, 0.16, yaw);
  };
  const addLake = (x, z, rx, rz, rot = 0) => {
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x55b9d2,
      roughness: 0.35,
      metalness: 0.03,
      transparent: true,
      opacity: 0.78,
    });
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 24), lakeMat);
    lake.scale.set(rx, 1, rz);
    lake.position.set(x, 3.02, z);
    lake.rotation.y = rot;
    lake.receiveShadow = true;
    group.add(lake);
    const shore = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 30), mat(0xd8c17b));
    shore.scale.set(rx * 1.03, rz * 1.03, 0.12);
    shore.position.set(x, 3.08, z);
    shore.rotation.x = Math.PI / 2;
    shore.rotation.z = rot;
    group.add(shore);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + rot;
      const reed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), mat(0x4f8b4d));
      reed.position.set(x + Math.cos(angle) * rx * 0.9, 3.45, z + Math.sin(angle) * rz * 0.9);
      reed.rotation.z = Math.sin(angle) * 0.2;
      group.add(reed);
    }
    obstacles.push({ x: data.x + x, z: data.z + z, r: Math.max(rx, rz) * 0.88 });
  };
  const addForestPatch = (x, z, count, spread, theme = data.theme) => {
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 5) {
      tries++;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * spread;
      const tree = makeIslandTree(theme);
      tree.position.set(x + Math.cos(angle) * distance, 2.3, z + Math.sin(angle) * distance);
      const treeRadius = 1.65;
      if (!clearOfNoTreeZones(tree.position.x, tree.position.z, treeRadius + 3.4)) continue;
      tree.scale.setScalar(0.82 + Math.random() * 0.65);
      group.add(tree);
      obstacles.push({ x: data.x + tree.position.x, z: data.z + tree.position.z, r: 1.35 * tree.scale.x });
      placed++;
    }
  };
  const addDecoratedHouse = (slot, index) => {
    const palettes = [
      { wall: 0xf1dcc0, roof: 0xb84f44 },
      { wall: 0xb77b42, roof: 0x5a3b25 },
      { wall: 0xd8d2bd, roof: 0x4051a8 },
      { wall: 0xe2d0a5, roof: 0xd7b44a },
      { wall: 0x9b8b78, roof: 0x4f5963 },
    ];
    const themedStyles = {
      norse: ["longhouse", "cottage", "warehouse"],
      pagoda: ["pagodaHouse", "twoStory", "stilt"],
      iberian: ["villa", "twoStory", "cottage"],
      fort: ["towerHouse", "twoStory", "warehouse"],
      naval: ["twoStory", "towerHouse", "warehouse"],
      trade: ["warehouse", "twoStory", "villa"],
      lagoon: ["stilt", "cottage", "twoStory"],
      atoll: ["cottage", "stilt", "standard"],
      rocky: ["twoStory", "cottage", "towerHouse"],
    };
    const styles = themedStyles[data.theme] || ["standard", "twoStory", "warehouse"];
    const style = slot.style || styles[(dockThemeSeed + index) % styles.length];
    const floors = slot.floors || (["twoStory", "warehouse", "towerHouse", "villa", "pagodaHouse"].includes(style) ? 2 : 1);
    const palette = palettes[(dockThemeSeed + index) % palettes.length];
    addInteriorHouse(slot.x, slot.z, slot.w, slot.d, slot.color || palette.wall, slot.roof || palette.roof, { style, floors });
    if (index % 2 === 0) {
      const awning = new THREE.Mesh(new THREE.BoxGeometry(slot.w * 0.62, 0.12, 1.0), mat(accent));
      awning.position.set(slot.x, floors > 1 ? 4.85 : 4.35, slot.z + slot.d * 0.62);
      awning.rotation.x = -0.18;
      awning.castShadow = true;
      group.add(awning);
    } else {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.42), mat(0x5a3b25));
      chimney.position.set(slot.x + slot.w * 0.28, floors > 1 ? 6.65 : 5.65, slot.z - slot.d * 0.25);
      chimney.castShadow = true;
      group.add(chimney);
    }
  };
  const addExtraHouseCluster = () => {
    if (data.name === "Port Azure") return;
    const denseTown = ["trade", "market", "naval", "fort", "iberian"].includes(data.theme);
    const slots = [
      { x: -radius * 0.08, z: radius * 0.28, w: 4.65, d: 3.35, style: denseTown ? "twoStory" : undefined, floors: denseTown ? 2 : undefined },
      { x: radius * 0.32, z: radius * 0.02, w: 3.7, d: 3.0 },
      { x: -radius * 0.35, z: radius * 0.23, w: 5.15, d: 3.55, style: denseTown ? "warehouse" : undefined, floors: denseTown ? 2 : undefined },
      { x: radius * 0.16, z: -radius * 0.02, w: 4.1, d: 3.2 },
      { x: radius * 0.04, z: radius * 0.39, w: 3.7, d: 3.0 },
    ];
    slots
      .filter((slot) => clearBuildSpot(slot.x, slot.z, slot.w, slot.d))
      .slice(0, denseTown ? 4 : 3)
      .forEach(addDecoratedHouse);
  };
  const addPortAzureCastle = () => {
    const castleX = radius * 0.22;
    const castleZ = -radius * 0.3;
    const castleW = 24;
    const castleD = 20;
    noTreeZones.push({ x: castleX, z: castleZ, r: Math.max(castleW, castleD) * 0.72 + 5.5 });
    reservedBuildZones.push({ x: castleX, z: castleZ, r: Math.hypot(castleW, castleD) * 0.5 + 1.2 });
    const baseY = 3.02;
    const wallH = 5.2;
    const wallSink = 1.1;
    const wallBodyH = wallH + wallSink;
    const wallBodyY = baseY + wallH * 0.5 - wallSink * 0.5;
    const wallTopY = baseY + wallH;
    const topY = wallTopY + 0.18;
    const stone = mat(0x7e8991);
    const darkStone = mat(0x4f5963);
    const floorStone = mat(0x6f7880);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffbd55,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const glowHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa63c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const castle = new THREE.Group();
    const addCastlePiece = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      castle.add(mesh);
      return mesh;
    };
    const addCastleLight = (x, y, z, facing = "z", haloScale = 0.9, direction = 1) => {
      if (facing === "floor") {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.68, 7), mats.dark);
        addCastlePiece(post, x, y - 0.32, z);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.1, 9), mats.dark);
        addCastlePiece(base, x, y - 0.67, z);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), glowMaterial);
        addCastlePiece(lantern, x, y, z);
        const halo = new THREE.Mesh(new THREE.CircleGeometry(haloScale, 24), glowHaloMaterial);
        halo.rotation.x = -Math.PI / 2;
        addCastlePiece(halo, x, y - 0.55, z);
        return;
      }
      const outwardX = facing === "x" ? direction : 0;
      const outwardZ = facing === "z" ? direction : 0;
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(facing === "x" ? 0.08 : 0.48, 0.5, facing === "x" ? 0.48 : 0.08),
        mats.dark,
      );
      addCastlePiece(plate, x, y, z);
      const armStart = new THREE.Vector3(x + outwardX * 0.04, y + 0.08, z + outwardZ * 0.04);
      const armEnd = new THREE.Vector3(x + outwardX * 0.52, y - 0.04, z + outwardZ * 0.52);
      addRope(castle, armStart, armEnd, 1, 0.035, mats.dark);
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 8), mats.dark);
      addCastlePiece(cage, armEnd.x + outwardX * 0.1, armEnd.y - 0.16, armEnd.z + outwardZ * 0.1);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), glowMaterial);
      addCastlePiece(lantern, armEnd.x + outwardX * 0.1, armEnd.y - 0.16, armEnd.z + outwardZ * 0.1);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(haloScale, 24), glowHaloMaterial);
      if (facing === "x") halo.rotation.y = Math.PI / 2;
      addCastlePiece(halo, armEnd.x + outwardX * 0.12, armEnd.y - 0.16, armEnd.z + outwardZ * 0.12);
    };
    const addCastleSlit = (x, z, facing = "z") => {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(facing === "x" ? 0.055 : 0.2, 0.86, facing === "x" ? 0.2 : 0.055), mats.dark);
      addCastlePiece(slit, x, baseY + 2.55, z);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(facing === "x" ? 0.035 : 0.16, 0.58, facing === "x" ? 0.16 : 0.035), glowMaterial);
      addCastlePiece(glow, x, baseY + 2.55, z);
    };
    const addCastleFlag = (x, z, color) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.55, 7), mats.dark);
      addCastlePiece(pole, x, topY + 0.7, z);
      const flag = clothPanel(1.0, 0.52, color, 0.035);
      flag.position.set(x + 0.42, topY + 1.08, z);
      flag.rotation.y = 0.08;
      flag.castShadow = true;
      castle.add(flag);
    };
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW, 0.18, castleD), mats.plank), 0, baseY + 0.02, 0);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW, wallBodyH, 0.65), stone), 0, wallBodyY, -castleD * 0.5);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(0.65, wallBodyH, castleD), stone), -castleW * 0.5, wallBodyY, 0);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(0.65, wallBodyH, castleD), stone), castleW * 0.5, wallBodyY, 0);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, wallBodyH, 0.65), stone), -castleW * 0.32, wallBodyY, castleD * 0.5);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, wallBodyH, 0.65), stone), castleW * 0.32, wallBodyY, castleD * 0.5);
    for (const y of [baseY + 1.05, wallTopY - 0.48]) {
      addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW + 0.45, 0.18, 0.18), darkStone), 0, y, -castleD * 0.5 - 0.36);
      addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, 0.18, 0.18), darkStone), -castleW * 0.32, y, castleD * 0.5 + 0.36);
      addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(castleW * 0.36, 0.18, 0.18), darkStone), castleW * 0.32, y, castleD * 0.5 + 0.36);
      addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, castleD + 0.45), darkStone), -castleW * 0.5 - 0.36, y, 0);
      addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, castleD + 0.45), darkStone), castleW * 0.5 + 0.36, y, 0);
    }
    const gateZ = castleD * 0.5 + 0.04;
    const gatePierW = 1.08;
    const gateGap = 3.55;
    for (const side of [-1, 1]) {
      const pierX = side * (gateGap * 0.5 + gatePierW * 0.5);
      const pier = new THREE.Mesh(new THREE.BoxGeometry(gatePierW, wallBodyH, 0.86), darkStone);
      addCastlePiece(pier, pierX, wallBodyY, gateZ);
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.34, wallH * 0.62, 0.32), stone);
      addCastlePiece(jamb, side * gateGap * 0.5, baseY + wallH * 0.31, gateZ + 0.38);
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.66, wallH * 0.82, 1.28), stone);
      addCastlePiece(buttress, side * (gateGap * 0.5 + gatePierW + 0.28), baseY + wallH * 0.41, gateZ + 0.12);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 1.08), darkStone);
      addCastlePiece(cap, pierX, baseY + wallH + 0.12, gateZ);
    }
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(gateGap + gatePierW * 2.45, 0.92, 1.04), stone), 0, baseY + 3.88, gateZ);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(gateGap + gatePierW * 2.8, 0.36, 1.12), darkStone), 0, baseY + 4.62, gateZ);
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.32), darkStone);
    addCastlePiece(keystone, 0, baseY + 3.42, gateZ + 0.42);
    for (let i = -2; i <= 2; i++) {
      const voussoir = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.28), i === 0 ? darkStone : stone);
      voussoir.rotation.z = i * 0.12;
      addCastlePiece(voussoir, i * 0.42, baseY + 3.1 + Math.abs(i) * 0.12, gateZ + 0.43);
    }
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(gateGap * 0.62, 0.22, 0.08), mats.gold), 0, baseY + 3.26, gateZ + 0.5);
    const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.95, 0.14), mat(0x2c211c));
    addCastlePiece(gateDoor, 0, baseY + 1.48, gateZ + 0.02);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.36, 0.24), darkStone), 0, baseY + 2.98, gateZ + 0.08);
    for (let i = -3; i <= 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.82, 0.08), mats.dark);
      addCastlePiece(bar, i * 0.38, baseY + 1.5, gateZ + 0.18);
    }
    addRope(castle, new THREE.Vector3(-1.28, baseY + 3.72, gateZ + 0.38), new THREE.Vector3(-0.66, baseY + 1.95, gateZ + 0.38), 1, 0.026, mats.dark);
    addRope(castle, new THREE.Vector3(1.28, baseY + 3.72, gateZ + 0.38), new THREE.Vector3(0.66, baseY + 1.95, gateZ + 0.38), 1, 0.026, mats.dark);
    for (const x of [-castleW * 0.28, 0, castleW * 0.28]) {
      addCastleSlit(x, -castleD * 0.5 - 0.035, "z");
    }
    for (const z of [-castleD * 0.24, castleD * 0.08, castleD * 0.32]) {
      addCastleSlit(-castleW * 0.5 - 0.035, z, "x");
      addCastleSlit(castleW * 0.5 + 0.035, z, "x");
    }
    addCastleLight(-2.55, baseY + 2.9, castleD * 0.5 + 0.36, "z", 0.85, 1);
    addCastleLight(2.55, baseY + 2.9, castleD * 0.5 + 0.36, "z", 0.85, 1);
    addCastleLight(-castleW * 0.34, baseY + 3.0, castleD * 0.5 + 0.36, "z", 0.7, 1);
    addCastleLight(castleW * 0.34, baseY + 3.0, castleD * 0.5 + 0.36, "z", 0.7, 1);
    addCastleLight(-castleW * 0.5 - 0.36, baseY + 3.05, -castleD * 0.12, "x", 0.75, -1);
    addCastleLight(castleW * 0.5 + 0.36, baseY + 3.05, -castleD * 0.12, "x", 0.75, 1);
    addCastleLight(-castleW * 0.22, baseY + 3.05, -castleD * 0.5 - 0.36, "z", 0.75, -1);
    addCastleLight(castleW * 0.22, baseY + 3.05, -castleD * 0.5 - 0.36, "z", 0.75, -1);
    addCastleLight(-castleW * 0.5 + 0.36, baseY + 2.45, -castleD * 0.06, "x", 0.9, 1);
    addCastleLight(castleW * 0.5 - 0.36, baseY + 2.45, -castleD * 0.06, "x", 0.9, -1);
    addCastlePiece(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 1.3), mats.wood), 0, baseY + 0.22, castleD * 0.5 + 0.14);
    const ledgeWidth = 4.25;
    [
      { x: 0, z: -castleD * 0.5, w: castleW + 1.4, d: ledgeWidth },
      { x: 0, z: castleD * 0.5, w: castleW + 1.4, d: ledgeWidth },
      { x: -castleW * 0.5, z: 0, w: ledgeWidth, d: castleD + 1.4 },
      { x: castleW * 0.5, z: 0, w: ledgeWidth, d: castleD + 1.4 },
    ].forEach((slab) => {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(slab.w, 0.28, slab.d), floorStone);
      addCastlePiece(floor, slab.x, topY - 0.14, slab.z);
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.25, wallH + 1.35, 12), darkStone);
        addCastlePiece(tower, sx * castleW * 0.5, baseY + (wallH + 1.1) * 0.5, sz * castleD * 0.5);
        const towerFloor = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.3, 12), floorStone);
        addCastlePiece(towerFloor, sx * castleW * 0.5, topY - 0.06, sz * castleD * 0.5);
        addCastleLight(sx * castleW * 0.5, topY + 0.64, sz * castleD * 0.5 + sz * 2.08, "z", 0.9, sz);
        addCastleLight(sx * castleW * 0.5 + sx * 2.08, topY + 0.46, sz * castleD * 0.5, "x", 0.72, sx);
        addCastleFlag(sx * castleW * 0.5 + sx * 0.18, sz * castleD * 0.5, sx === sz ? accent : 0xfff1a6);
        obstacles.push({ x: data.x + castleX + sx * castleW * 0.5, z: data.z + castleZ + sz * castleD * 0.5, r: 2.25 });
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = -castleW * 0.43 + i * castleW * 0.095;
      const rearBlock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.72), darkStone);
      addCastlePiece(rearBlock, x, topY + 0.325, -castleD * 0.5);
      const frontBlock = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.72), darkStone);
      addCastlePiece(frontBlock, x, topY + 0.325, castleD * 0.5);
    }
    for (let i = 0; i < 8; i++) {
      const z = -castleD * 0.4 + i * castleD * 0.114;
      const leftBlock = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 1.05), darkStone);
      addCastlePiece(leftBlock, -castleW * 0.5, topY + 0.325, z);
      const rightBlock = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 1.05), darkStone);
      addCastlePiece(rightBlock, castleW * 0.5, topY + 0.325, z);
    }
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const stepY = baseY + 0.12 + t * (topY - baseY - 0.12);
      const stepZ = castleD * 0.24 - t * castleD * 0.58;
      const stepHeight = Math.max(0.28, stepY - baseY + 0.18);
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.85, stepHeight, 1.35), mats.wood);
      addCastlePiece(step, castleW * 0.27, stepY - stepHeight * 0.5, stepZ);
      addWalkPlatform(castleX + castleW * 0.27, castleZ + stepZ, 3.0, 1.42, stepY, 0, { maxRise: 1.15 });
    }
    const stairLandingZ = -castleD * 0.42;
    const stairLanding = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.3, 3.7), floorStone);
    addCastlePiece(stairLanding, castleW * 0.27, topY - 0.14, stairLandingZ);
    addWalkPlatform(castleX + castleW * 0.27, castleZ + stairLandingZ, 3.7, 3.85, topY, 0, { maxRise: 1.15 });
    [
      { x: 0, z: -castleD * 0.5, w: castleW + 0.65, d: ledgeWidth - 0.35 },
      { x: 0, z: castleD * 0.5, w: castleW + 0.65, d: ledgeWidth - 0.35 },
      { x: -castleW * 0.5, z: 0, w: ledgeWidth - 0.35, d: castleD + 0.65 },
      { x: castleW * 0.5, z: 0, w: ledgeWidth - 0.35, d: castleD + 0.65 },
    ].forEach((platform) => addWalkPlatform(castleX + platform.x, castleZ + platform.z, platform.w, platform.d, topY, 0, { maxRise: 1.2 }));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) addWalkPlatform(castleX + sx * castleW * 0.5, castleZ + sz * castleD * 0.5, 4.55, 4.55, topY + 0.08, 0, { maxRise: 1.2 });
    }
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 1.3), mats.wood);
    addCastlePiece(table, -castleW * 0.18, baseY + 0.45, -castleD * 0.1);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), mat(0x5a3b25));
        addCastlePiece(leg, -castleW * 0.18 + sx * 1.05, baseY + 0.28, -castleD * 0.1 + sz * 0.46);
      }
    }
    const mapTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.035, 0.95), mat(0xd8c28f));
    addCastlePiece(mapTop, -castleW * 0.18, baseY + 0.59, -castleD * 0.1);
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.32, 0.8), darkStone);
    addCastlePiece(hearth, castleW * 0.22, baseY + 0.32, -castleD * 0.18);
    const hearthGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), glowMaterial);
    hearthGlow.scale.set(1.05, 0.38, 0.78);
    addCastlePiece(hearthGlow, castleW * 0.22, baseY + 0.48, -castleD * 0.18);
    for (const offset of [-0.28, 0.28]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.7, 7), mats.wood);
      log.rotation.z = Math.PI / 2;
      log.position.set(castleW * 0.22 + offset, baseY + 0.5, -castleD * 0.18);
      log.castShadow = true;
      castle.add(log);
    }
    for (const z of [-castleD * 0.3, castleD * 0.12]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.42), mats.wood);
      addCastlePiece(bench, -castleW * 0.02, baseY + 0.38, z);
      for (const x of [-0.86, 0.86]) {
        const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.18), mat(0x5a3b25));
        addCastlePiece(support, -castleW * 0.02 + x, baseY + 0.22, z);
      }
    }
    for (const side of [-1, 1]) {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 6), mat(side < 0 ? accent : 0xfff1a6));
      shield.rotation.x = Math.PI / 2;
      addCastlePiece(shield, side * castleW * 0.16, baseY + 2.55, castleD * 0.5 + 0.38);
    }
    for (const side of [-1, 1]) {
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.15, 9), mats.dark);
      cannon.rotation.x = Math.PI / 2;
      addCastlePiece(cannon, side * castleW * 0.22, topY + 0.34, castleD * 0.5 + 0.06);
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.46), mats.wood);
      addCastlePiece(carriage, side * castleW * 0.22, topY + 0.08, castleD * 0.5 - 0.34);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.62), mats.crate);
      addCastlePiece(crate, side * castleW * 0.34, baseY + 0.28, -castleD * 0.28);
    }
    const bannerA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 1.0), mat(accent));
    addCastlePiece(bannerA, -castleW * 0.5 - 0.04, baseY + 2.7, castleD * 0.2);
    const bannerB = bannerA.clone();
    addCastlePiece(bannerB, castleW * 0.5 + 0.04, baseY + 2.7, castleD * 0.2);
    castle.position.set(castleX, 0, castleZ);
    group.add(castle);
    shipNightLights.push({
      group: castle,
      material: glowMaterial,
      haloMaterial: glowHaloMaterial,
      haloOpacity: 0.18,
      lights: [],
      baseIntensity: 0,
    });
    addCollisionBox(castleX, castleZ - castleD * 0.5, castleW, 0.85, 0.12);
    addCollisionBox(castleX - castleW * 0.5, castleZ, 0.85, castleD, 0.12);
    addCollisionBox(castleX + castleW * 0.5, castleZ, 0.85, castleD, 0.12);
    addCollisionBox(castleX - (gateGap * 0.5 + gatePierW * 0.5), castleZ + gateZ, gatePierW, 0.92, 0.08);
    addCollisionBox(castleX + (gateGap * 0.5 + gatePierW * 0.5), castleZ + gateZ, gatePierW, 0.92, 0.08);
    addCollisionBox(castleX - castleW * 0.32, castleZ + castleD * 0.5, castleW * 0.36, 0.85, 0.12);
    addCollisionBox(castleX + castleW * 0.32, castleZ + castleD * 0.5, castleW * 0.36, 0.85, 0.12);
    collisionBoxes.slice(-7).forEach((box) => {
      box.walkableTopY = topY - 0.25;
      box.solidWall = true;
    });
    const topWallOptions = { minY: topY - 0.45, solidWall: true };
    addCollisionBox(castleX, castleZ - castleD * 0.5 - ledgeWidth * 0.5 + 0.16, castleW + 1.25, 0.34, 0.04, 0, topWallOptions);
    addCollisionBox(castleX, castleZ + castleD * 0.5 + ledgeWidth * 0.5 - 0.16, castleW + 1.25, 0.34, 0.04, 0, topWallOptions);
    addCollisionBox(castleX - castleW * 0.5 - ledgeWidth * 0.5 + 0.16, castleZ, 0.34, castleD + 1.25, 0.04, 0, topWallOptions);
    addCollisionBox(castleX + castleW * 0.5 + ledgeWidth * 0.5 - 0.16, castleZ, 0.34, castleD + 1.25, 0.04, 0, topWallOptions);
    addWalkPlatform(castleX, castleZ, castleW - 1.4, castleD - 1.4, baseY + 0.13, 0, { maxRise: 0.9 });
  };
  const addCrownHarborCastle = () => {
    const castleX = radius * 0.28;
    const castleZ = -radius * 0.24;
    const fortW = 30;
    const fortD = 22;
    const baseY = 3.02;
    const wallH = 4.4;
    const wallSink = 1.1;
    const wallBodyH = wallH + wallSink;
    const wallBodyY = baseY + wallH * 0.5 - wallSink * 0.5;
    const topY = baseY + wallH + 0.18;
    noTreeZones.push({ x: castleX, z: castleZ, r: Math.max(fortW, fortD) * 0.72 + 8 });
    reservedBuildZones.push({ x: castleX, z: castleZ, r: Math.hypot(fortW, fortD) * 0.5 + 1.4 });
    const stone = mat(0x7c8581);
    const paleStone = mat(0xb6b59e);
    const darkStone = mat(0x48565b);
    const crownGold = mat(0xd99928);
    const roofBlue = mat(0x355d8e);
    const interiorStone = paleStone.clone();
    interiorStone.side = THREE.DoubleSide;
    interiorStone.needsUpdate = true;
    const keepStone = stone.clone();
    keepStone.side = THREE.DoubleSide;
    keepStone.needsUpdate = true;
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc46a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const castle = new THREE.Group();
    const crownLights = [];
    const addPiece = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      castle.add(mesh);
      return mesh;
    };
    const addWallLamp = (x, y, z, facing = "z", direction = 1) => {
      const outwardX = facing === "x" ? direction : 0;
      const outwardZ = facing === "z" ? direction : 0;
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(facing === "x" ? 0.08 : 0.42, 0.42, facing === "x" ? 0.42 : 0.08), mats.dark), x, y, z);
      const armStart = new THREE.Vector3(x + outwardX * 0.04, y + 0.04, z + outwardZ * 0.04);
      const armEnd = new THREE.Vector3(x + outwardX * 0.48, y - 0.06, z + outwardZ * 0.48);
      addRope(castle, armStart, armEnd, 1, 0.03, mats.dark);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), glowMaterial);
      addPiece(lantern, armEnd.x + outwardX * 0.08, armEnd.y - 0.12, armEnd.z + outwardZ * 0.08);
    };
    const addFlag = (x, z, color = accent) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 2.1, 7), mats.dark);
      addPiece(pole, x, topY + 0.9, z);
      const flag = clothPanel(1.2, 0.6, color, 0.035);
      flag.position.set(x + 0.48, topY + 1.35, z);
      flag.rotation.y = 0.08;
      flag.castShadow = true;
      castle.add(flag);
    };
    const addCannon = (x, z, yaw) => {
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.52), mats.wood);
      carriage.rotation.y = yaw;
      addPiece(carriage, x, topY + 0.08, z);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.45, 10), mats.dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.rotation.z = -yaw;
      addPiece(barrel, x + Math.sin(yaw) * 0.38, topY + 0.36, z + Math.cos(yaw) * 0.38);
      addCollisionBox(castleX + x, castleZ + z, 1.05, 0.82, 0.08, yaw, { minY: topY - 0.45, maxY: topY + 1.1 });
    };
    addPiece(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.42, 8), paleStone), 0, baseY - 0.18, 0).scale.set(fortW * 0.62, 1, fortD * 0.54);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(fortW - 0.95, 0.22, fortD - 0.95), mats.plank), 0, baseY + 0.02, 0);
    addWalkPlatform(castleX, castleZ, fortW - 1.05, fortD - 1.05, baseY + 0.14, 0, { maxRise: 0.9 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(fortW, wallBodyH, 0.82), stone);
    addPiece(backWall, 0, wallBodyY, -fortD * 0.5);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.82, wallBodyH, fortD), stone), -fortW * 0.5, wallBodyY, 0);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.82, wallBodyH, fortD), stone), fortW * 0.5, wallBodyY, 0);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(fortW * 0.32, wallBodyH, 0.82), stone), -fortW * 0.34, wallBodyY, fortD * 0.5);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(fortW * 0.32, wallBodyH, 0.82), stone), fortW * 0.34, wallBodyY, fortD * 0.5);
    const gateW = 4.2;
    const gateZ = fortD * 0.5 + 0.12;
    for (const sx of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.95, wallH + 1.4, 10), darkStone);
      addPiece(tower, sx * (gateW * 0.5 + 1.45), baseY + (wallH + 1.25) * 0.5, gateZ);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 1.25, 10), roofBlue);
      addPiece(roof, sx * (gateW * 0.5 + 1.45), baseY + wallH + 1.35, gateZ);
      addWallLamp(sx * (gateW * 0.5 + 3.22), baseY + 2.55, gateZ + 0.45, "z", 1);
    }
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(gateW + 3.7, 1.1, 1.0), darkStone), 0, baseY + 3.85, gateZ);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(gateW + 4.2, 0.38, 1.18), crownGold), 0, baseY + 4.58, gateZ);
    const gateArch = new THREE.Mesh(new THREE.TorusGeometry(gateW * 0.48, 0.15, 8, 22, Math.PI), paleStone);
    gateArch.position.set(0, baseY + 2.72, gateZ + 0.52);
    gateArch.rotation.x = Math.PI / 2;
    castle.add(gateArch);
    const portcullis = new THREE.Mesh(new THREE.BoxGeometry(gateW * 0.72, 2.9, 0.1), mats.dark);
    addPiece(portcullis, 0, baseY + 1.45, gateZ + 0.22);
    for (let i = -3; i <= 3; i++) addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 0.12), mats.gold), i * 0.42, baseY + 1.45, gateZ + 0.34);
    const drawbridge = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 5.2), mats.wood);
    drawbridge.rotation.x = -0.08;
    addPiece(drawbridge, 0, baseY + 0.02, fortD * 0.5 + 3.0);
    for (const sx of [-1, 1]) addRope(castle, new THREE.Vector3(sx * 1.8, baseY + 3.6, gateZ + 0.35), new THREE.Vector3(sx * 2.05, baseY + 0.62, fortD * 0.5 + 4.9), 1, 0.032, mats.dark);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bastion = new THREE.Mesh(new THREE.BoxGeometry(6.4, wallH + 0.55, 6.4), darkStone);
        bastion.rotation.y = Math.PI / 4;
        addPiece(bastion, sx * (fortW * 0.5 + 1.45), baseY + (wallH + 0.42) * 0.5, sz * (fortD * 0.5 + 1.45));
        const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.28, 6.8), paleStone);
        deck.rotation.y = Math.PI / 4;
        addPiece(deck, sx * (fortW * 0.5 + 1.45), topY - 0.08, sz * (fortD * 0.5 + 1.45));
        addWalkPlatform(castleX + sx * (fortW * 0.5 + 1.45), castleZ + sz * (fortD * 0.5 + 1.45), 6.8, 6.8, topY + 0.04, Math.PI / 4, { maxRise: 1.2 });
        addFlag(sx * (fortW * 0.5 + 1.45), sz * (fortD * 0.5 + 1.45), sz > 0 ? accent : 0xfff1a6);
        obstacles.push({ x: data.x + castleX + sx * (fortW * 0.5 + 1.45), z: data.z + castleZ + sz * (fortD * 0.5 + 1.45), r: 3.8 });
      }
    }
    const wallWalks = [
      { x: 0, z: -fortD * 0.5, w: fortW + 1.5, d: 3.2 },
      { x: 0, z: fortD * 0.5, w: fortW + 1.5, d: 3.2 },
      { x: -fortW * 0.5, z: 0, w: 3.2, d: fortD + 1.5 },
      { x: fortW * 0.5, z: 0, w: 3.2, d: fortD + 1.5 },
    ];
    wallWalks.forEach((walk) => {
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(walk.w, 0.26, walk.d), paleStone), walk.x, topY - 0.13, walk.z);
      addWalkPlatform(castleX + walk.x, castleZ + walk.z, walk.w - 0.2, walk.d - 0.2, topY, 0, { maxRise: 1.2 });
    });
    const crownTopWallOptions = { minY: topY - 0.45, solidWall: true };
    addCollisionBox(castleX, castleZ - fortD * 0.5 - 1.46, fortW + 1.35, 0.34, 0.04, 0, crownTopWallOptions);
    addCollisionBox(castleX, castleZ + fortD * 0.5 + 1.46, fortW + 1.35, 0.34, 0.04, 0, crownTopWallOptions);
    addCollisionBox(castleX - fortW * 0.5 - 1.46, castleZ, 0.34, fortD + 1.35, 0.04, 0, crownTopWallOptions);
    addCollisionBox(castleX + fortW * 0.5 + 1.46, castleZ, 0.34, fortD + 1.35, 0.04, 0, crownTopWallOptions);
    for (let i = 0; i < 9; i++) {
      const x = -fortW * 0.42 + i * fortW * 0.105;
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.72), darkStone), x, topY + 0.34, -fortD * 0.5);
      if (i !== 4) addPiece(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.72), darkStone), x, topY + 0.34, fortD * 0.5);
    }
    for (let i = 0; i < 7; i++) {
      const z = -fortD * 0.38 + i * fortD * 0.13;
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 1.0), darkStone), -fortW * 0.5, topY + 0.34, z);
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 1.0), darkStone), fortW * 0.5, topY + 0.34, z);
    }
    const keepX = -fortW * 0.18;
    const keepZ = -fortD * 0.08;
    const keep = new THREE.Mesh(new THREE.CylinderGeometry(4.15, 4.8, 6.2, 8), keepStone);
    addPiece(keep, keepX, baseY + 3.1, keepZ);
    const keepTop = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.32, 8), paleStone);
    addPiece(keepTop, keepX, baseY + 6.36, keepZ);
    const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(4.75, 2.2, 8), roofBlue);
    addPiece(keepRoof, keepX, baseY + 7.6, keepZ);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.12, 8, 18), crownGold);
    crown.position.set(keepX, baseY + 8.95, keepZ);
    crown.rotation.x = Math.PI / 2;
    castle.add(crown);
    const crownSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 8), crownGold);
    addPiece(crownSpire, keepX, baseY + 9.55, keepZ);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.08), glowMaterial);
      window.position.set(keepX + Math.sin(angle) * 4.22, baseY + 4.2, keepZ + Math.cos(angle) * 4.22);
      window.rotation.y = angle;
      castle.add(window);
    }
    const keepFloor = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.65, 0.16, 16), mats.plank);
    keepFloor.rotation.y = Math.PI / 16;
    addPiece(keepFloor, keepX, baseY + 0.1, keepZ);
    const keepDoorZ = keepZ + 4.72;
    const keepDoor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.15, 0.16), mats.dark);
    addPiece(keepDoor, keepX, baseY + 1.14, keepDoorZ);
    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.34, 0.56), paleStone);
      addPiece(jamb, keepX + side * 0.88, baseY + 1.22, keepDoorZ + 0.03);
    }
    const keepDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.26, 0.58), crownGold);
    addPiece(keepDoorLintel, keepX, baseY + 2.36, keepDoorZ + 0.04);
    const keepDoorArch = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.08, 8, 18, Math.PI), crownGold);
    keepDoorArch.rotation.x = Math.PI / 2;
    addPiece(keepDoorArch, keepX, baseY + 2.15, keepDoorZ + 0.12);
    const keepThreshold = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 0.92), paleStone);
    addPiece(keepThreshold, keepX, baseY + 0.08, keepDoorZ + 0.42);
    addWalkPlatform(castleX + keepX, castleZ + keepDoorZ + 0.42, 2.15, 0.98, baseY + 0.18, 0, { maxRise: 0.7 });
    const exitTrimZ = keepZ + 3.58;
    const exitBackPlate = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.42, 0.08), darkStone);
    addPiece(exitBackPlate, keepX, baseY + 1.26, exitTrimZ);
    const exitCutout = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.05, 0.09), mats.dark);
    addPiece(exitCutout, keepX, baseY + 1.1, exitTrimZ + 0.05);
    for (const side of [-1, 1]) {
      const innerJamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.18, 0.14), crownGold);
      addPiece(innerJamb, keepX + side * 0.79, baseY + 1.18, exitTrimZ + 0.08);
      const exitLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), glowMaterial);
      addPiece(exitLamp, keepX + side * 1.08, baseY + 1.8, exitTrimZ + 0.12);
    }
    const innerLintel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 0.14), crownGold);
    addPiece(innerLintel, keepX, baseY + 2.2, exitTrimZ + 0.08);
    const crossLong = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 2.4), crownGold);
    addPiece(crossLong, keepX, baseY + 0.24, keepZ);
    const crossWide = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.34), crownGold);
    addPiece(crossWide, keepX, baseY + 0.25, keepZ);
    const roundTable = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.28, 10), mats.wood);
    addPiece(roundTable, keepX - 1.25, baseY + 0.42, keepZ - 0.55);
    const mapTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.68), mat(0xd8c28f));
    mapTop.rotation.y = -0.22;
    addPiece(mapTop, keepX - 1.25, baseY + 0.59, keepZ - 0.55);
    const scrollShelf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.12, 1.48), mats.wood);
    addPiece(scrollShelf, keepX - 2.62, baseY + 0.78, keepZ + 0.62);
    for (let i = 0; i < 3; i++) {
      const shelfLine = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 1.34), crownGold);
      addPiece(shelfLine, keepX - 2.62, baseY + 0.42 + i * 0.34, keepZ + 0.62);
    }
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.62, 0.72), mats.crate);
    addPiece(chest, keepX + 1.68, baseY + 0.42, keepZ - 1.35);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 0.46), mats.wood);
    bench.rotation.y = Math.PI * 0.18;
    addPiece(bench, keepX + 1.38, baseY + 0.36, keepZ + 1.26);
    for (const offset of [-0.62, 0.62]) {
      const benchLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.13), mats.wood);
      addPiece(benchLeg, keepX + 1.38 + offset, baseY + 0.2, keepZ + 1.26);
    }
    const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.18, 1.34), darkStone);
    addPiece(weaponRack, keepX + 2.72, baseY + 0.82, keepZ + 0.08);
    for (let i = -1; i <= 1; i++) {
      const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.55, 5), mats.dark);
      spear.rotation.z = 0.18;
      addPiece(spear, keepX + 2.72, baseY + 1.06, keepZ + i * 0.36);
    }
    const keepLamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMaterial);
    addPiece(keepLamp, keepX, baseY + 3.25, keepZ);
    addWalkPlatform(castleX + keepX, castleZ + keepZ, 6.6, 6.3, baseY + 0.18, 0, { maxRise: 0.8 });
    const hallX = fortW * 0.2;
    const hallZ = -fortD * 0.05;
    const hallW = 7.2;
    const hallD = 4.6;
    const hallWallH = 3.2;
    const hallDoorW = 1.48;
    const hallBack = new THREE.Mesh(new THREE.BoxGeometry(hallW, hallWallH, 0.22), interiorStone);
    addPiece(hallBack, hallX, baseY + hallWallH * 0.5, hallZ - hallD * 0.5);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.22, hallWallH, hallD), interiorStone), hallX - hallW * 0.5, baseY + hallWallH * 0.5, hallZ);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.22, hallWallH, hallD), interiorStone), hallX + hallW * 0.5, baseY + hallWallH * 0.5, hallZ);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry((hallW - hallDoorW) * 0.5, hallWallH, 0.22), interiorStone), hallX - (hallDoorW * 0.5 + (hallW - hallDoorW) * 0.25), baseY + hallWallH * 0.5, hallZ + hallD * 0.5);
    addPiece(new THREE.Mesh(new THREE.BoxGeometry((hallW - hallDoorW) * 0.5, hallWallH, 0.22), interiorStone), hallX + (hallDoorW * 0.5 + (hallW - hallDoorW) * 0.25), baseY + hallWallH * 0.5, hallZ + hallD * 0.5);
    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(hallW - 0.35, 0.12, hallD - 0.35), mats.plank);
    addPiece(hallFloor, hallX, baseY + 0.08, hallZ);
    const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.5, 4), roofBlue);
    hallRoof.rotation.y = Math.PI / 4;
    addPiece(hallRoof, hallX, baseY + 4.05, hallZ);
    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.7, 0.12), mats.dark);
    addPiece(openDoor, hallX, baseY + 0.95, hallZ + hallD * 0.5 + 0.08);
    const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.2, 0.16), crownGold);
    addPiece(doorTrim, hallX, baseY + 1.9, hallZ + hallD * 0.5 + 0.12);
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 1.2), mats.wood);
    addPiece(table, hallX - 1.8, baseY + 0.5, hallZ - 1.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addPiece(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), mats.wood), hallX - 1.8 + sx * 1.05, baseY + 0.27, hallZ - 1.1 + sz * 0.46);
    const benchA = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 0.42), mats.wood);
    addPiece(benchA, hallX + 1.55, baseY + 0.36, hallZ - 1.25);
    const benchB = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, 0.42), mats.wood);
    addPiece(benchB, hallX + 1.55, baseY + 0.36, hallZ + 0.55);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.72), mat(accent));
    addPiece(banner, hallX + hallW * 0.5 - 0.08, baseY + 1.82, hallZ - 0.75);
    const hallLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), glowMaterial);
    addPiece(hallLamp, hallX, baseY + 2.5, hallZ - 0.2);
    addWalkPlatform(castleX + hallX, castleZ + hallZ, hallW - 0.5, hallD - 0.5, baseY + 0.18, 0, { maxRise: 0.8 });
    const stairStartX = fortW * 0.37;
    const stairStartZ = fortD * 0.18;
    const stairEndX = fortW * 0.18;
    const stairEndZ = fortD * 0.5 - 1.55;
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const stepY = baseY + 0.16 + t * (topY - baseY - 0.08);
      const stepX = stairStartX + (stairEndX - stairStartX) * t;
      const stepZ = stairStartZ + (stairEndZ - stairStartZ) * t;
      const stepHeight = Math.max(0.24, stepY - baseY + 0.12);
      addPiece(new THREE.Mesh(new THREE.BoxGeometry(2.25, stepHeight, 0.92), mats.wood), stepX, stepY - stepHeight * 0.5, stepZ);
      addWalkPlatform(castleX + stepX, castleZ + stepZ, 2.4, 1.04, stepY, 0, { maxRise: 1.15 });
    }
    addCannon(-fortW * 0.28, fortD * 0.5 - 0.15, 0);
    addCannon(fortW * 0.28, fortD * 0.5 - 0.15, 0);
    addCannon(-fortW * 0.5 + 0.15, -fortD * 0.15, -Math.PI / 2);
    addCannon(fortW * 0.5 - 0.15, -fortD * 0.15, Math.PI / 2);
    for (const pos of [
      [-fortW * 0.38, baseY + 2.5, fortD * 0.5 + 0.38, "z", 1],
      [fortW * 0.38, baseY + 2.5, fortD * 0.5 + 0.38, "z", 1],
      [-fortW * 0.5 - 0.38, baseY + 2.75, -fortD * 0.18, "x", -1],
      [fortW * 0.5 + 0.38, baseY + 2.75, -fortD * 0.18, "x", 1],
      [0, baseY + 2.62, -fortD * 0.5 - 0.38, "z", -1],
    ]) addWallLamp(...pos);
    const keepLight = new THREE.PointLight(0xffc46a, 0, 18, 1.45);
    keepLight.position.set(keepX, baseY + 4.4, keepZ);
    castle.add(keepLight);
    const gateLight = new THREE.PointLight(0xffb44d, 0, 16, 1.5);
    gateLight.position.set(0, baseY + 2.6, gateZ + 0.4);
    castle.add(gateLight);
    crownLights.push(keepLight, gateLight);
    castle.position.set(castleX, 0, castleZ);
    group.add(castle);
    shipNightLights.push({
      group: castle,
      material: glowMaterial,
      haloMaterial: null,
      haloOpacity: 0,
      lights: crownLights,
      baseIntensity: 0.85,
    });
    addCollisionBox(castleX, castleZ - fortD * 0.5, fortW, 0.95, 0.12);
    addCollisionBox(castleX - fortW * 0.5, castleZ, 0.95, fortD, 0.12);
    addCollisionBox(castleX + fortW * 0.5, castleZ, 0.95, fortD, 0.12);
    addCollisionBox(castleX - fortW * 0.34, castleZ + fortD * 0.5, fortW * 0.32, 0.95, 0.12);
    addCollisionBox(castleX + fortW * 0.34, castleZ + fortD * 0.5, fortW * 0.32, 0.95, 0.12);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) addCollisionBox(castleX + sx * (fortW * 0.5 + 1.45), castleZ + sz * (fortD * 0.5 + 1.45), 5.3, 5.3, 0.12, Math.PI / 4);
    }
    collisionBoxes.slice(-9).forEach((box) => {
      box.solidWall = true;
    });
    addCollisionBox(castleX + keepX, castleZ + keepZ - 3.55, 6.4, 0.38, 0.08, 0, { maxY: baseY + 6.25, solidWall: true });
    addCollisionBox(castleX + keepX - 3.45, castleZ + keepZ, 0.38, 6.1, 0.08, 0, { maxY: baseY + 6.25, solidWall: true });
    addCollisionBox(castleX + keepX + 3.45, castleZ + keepZ, 0.38, 6.1, 0.08, 0, { maxY: baseY + 6.25, solidWall: true });
    addCollisionBox(castleX + keepX - 2.1, castleZ + keepZ + 3.45, 2.35, 0.38, 0.08, 0, { maxY: baseY + 6.25, solidWall: true });
    addCollisionBox(castleX + keepX + 2.1, castleZ + keepZ + 3.45, 2.35, 0.38, 0.08, 0, { maxY: baseY + 6.25, solidWall: true });
    addCollisionBox(castleX + keepX - 1.25, castleZ + keepZ - 0.55, 1.05, 1.05, 0.05, 0, { minY: baseY - 0.1, maxY: baseY + 1.1 });
    addCollisionBox(castleX + keepX - 2.62, castleZ + keepZ + 0.62, 0.62, 1.62, 0.05, 0, { minY: baseY - 0.1, maxY: baseY + 1.55 });
    addCollisionBox(castleX + keepX + 1.68, castleZ + keepZ - 1.35, 1.18, 0.82, 0.05, 0, { minY: baseY - 0.1, maxY: baseY + 1.05 });
    addCollisionBox(castleX + keepX + 1.38, castleZ + keepZ + 1.26, 1.9, 0.58, 0.05, Math.PI * 0.18, { minY: baseY - 0.1, maxY: baseY + 0.9 });
    addCollisionBox(castleX + keepX + 2.72, castleZ + keepZ + 0.08, 0.5, 1.5, 0.05, 0, { minY: baseY - 0.1, maxY: baseY + 1.75 });
    const hallWallMaxY = baseY + 3.7;
    addCollisionBox(castleX + hallX, castleZ + hallZ - hallD * 0.5, hallW, 0.28, 0.08, 0, { maxY: hallWallMaxY, solidWall: true });
    addCollisionBox(castleX + hallX - hallW * 0.5, castleZ + hallZ, 0.28, hallD, 0.08, 0, { maxY: hallWallMaxY, solidWall: true });
    addCollisionBox(castleX + hallX + hallW * 0.5, castleZ + hallZ, 0.28, hallD, 0.08, 0, { maxY: hallWallMaxY, solidWall: true });
    addCollisionBox(castleX + hallX - hallW * 0.32, castleZ + hallZ + hallD * 0.5, hallW * 0.28, 0.28, 0.08, 0, { maxY: hallWallMaxY, solidWall: true });
    addCollisionBox(castleX + hallX + hallW * 0.32, castleZ + hallZ + hallD * 0.5, hallW * 0.28, 0.28, 0.08, 0, { maxY: hallWallMaxY, solidWall: true });
    addCollisionBox(castleX + fortW * 0.08, castleZ - fortD * 0.18, 2.75, 1.35, 0.06, 0, { minY: baseY - 0.15, maxY: baseY + 1.2 });
    addWalkPlatform(castleX, castleZ + fortD * 0.5 + 3.0, 4.8, 5.2, baseY + 0.12, 0, { maxRise: 0.7 });
    addCollisionBox(castleX, castleZ + fortD * 0.5 + 3.0, 4.8, 5.2, 0.08, 0, { maxY: baseY + 0.65, walkableTopY: baseY + 0.1 });
  };
  if (!["atoll", "lagoon"].includes(data.theme)) {
    addMountain(-radius * 0.18, -radius * 0.2, radius * (data.theme === "rocky" ? 0.27 : 0.2), 3.8 + radius * 0.08, data.theme === "rocky" ? 0x4f5963 : 0x66706e);
  }
  addThemeHouse();
  if (data.name === "Crown Harbor") addCrownHarborCastle();
  addExtraHouseCluster();
  if (data.theme === "starter") addPortAzureCastle();
  if (["lagoon", "atoll", "trade", "market", "dhow", "schooner"].includes(data.theme)) {
    addLake(-radius * 0.18, radius * 0.16, radius * 0.075, radius * 0.048, 0.25);
  }
  if (["norse", "rocky", "naval", "fort", "starter", "schooner"].includes(data.theme)) {
    addForestPatch(-radius * 0.32, -radius * 0.04, data.theme === "starter" ? 30 : 24, radius * 0.18, data.theme);
  }
  if (["trade", "market", "iberian"].includes(data.theme)) {
    addForestPatch(radius * 0.32, radius * 0.16, 14, radius * 0.12, data.theme);
  }
  if (["rocky", "schooner", "naval", "trade"].includes(data.theme)) {
    const wreckAngle = data.theme === "naval" ? -1.0 : data.theme === "trade" ? 1.05 : data.theme === "rocky" ? -2.2 : 2.35;
    addShipwreck(wreckAngle, data.theme === "naval" ? "frigate" : "galleon");
  }
  if (data.theme === "norse") {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 2.4, 3.1), mat(0x8b5a32));
    hall.position.set(4.4, 3.7, -3.4);
    hall.castShadow = true;
    group.add(hall);
    const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 1.7, 4), mat(0x5a3b25));
    hallRoof.position.set(4.4, 5.45, -3.4);
    hallRoof.rotation.y = Math.PI / 4;
    group.add(hallRoof);
    collisionBoxes.push({ x: data.x + 4.4, z: data.z - 3.4, w: 7.2, d: 3.8 });
  } else if (data.theme === "pagoda") {
    const px = 7.0;
    const pz = -5.8;
    const pagodaW = 8.4;
    const pagodaD = 7.4;
    const levelYs = [3.18, 5.96, 8.74];
    const pagoda = new THREE.Group();
    const wallMat = mat(0xe4b46a);
    const beamMat = mat(0x7a2e25);
    const roofMat = mat(accent);
    const trimMat = mat(0xf0cf73);
    const stoneMat = mat(0x8d8a78);
    const paperMat = mat(0xf4e7bd);
    const pagodaGlow = new THREE.MeshBasicMaterial({
      color: 0xffc263,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const pagodaLights = [];
    noTreeZones.push({ x: px, z: pz, r: 8.5 });
    const addPagodaPiece = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pagoda.add(mesh);
      return mesh;
    };
    const addLantern = (x, y, z) => {
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.54, 6), mats.dark);
      hook.rotation.x = Math.PI / 2;
      addPagodaPiece(hook, x, y + 0.14, z);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), pagodaGlow);
      lantern.scale.set(0.9, 1.18, 0.9);
      addPagodaPiece(lantern, x, y - 0.12, z);
    };
    const addDeckPanel = (floorY, cx, cz, w, d) => {
      if (w <= 0.18 || d <= 0.18) return;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), mats.plank);
      addPagodaPiece(floor, cx, floorY - 0.09, cz);
      addWalkPlatform(px + cx, pz + cz, Math.max(0.4, w - 0.08), Math.max(0.4, d - 0.08), floorY, 0, { maxRise: 1.1 });
    };
    const addSplitDeck = (floorY, w, d, hole = null) => {
      if (!hole) {
        addDeckPanel(floorY, 0, 0, w, d);
        return;
      }
      const leftW = hole.x - hole.w * 0.5 + w * 0.5;
      const rightW = w * 0.5 - (hole.x + hole.w * 0.5);
      const backD = hole.z - hole.d * 0.5 + d * 0.5;
      const frontD = d * 0.5 - (hole.z + hole.d * 0.5);
      addDeckPanel(floorY, -w * 0.5 + leftW * 0.5, 0, leftW, d);
      addDeckPanel(floorY, hole.x + hole.w * 0.5 + rightW * 0.5, 0, rightW, d);
      addDeckPanel(floorY, hole.x, -d * 0.5 + backD * 0.5, hole.w, backD);
      addDeckPanel(floorY, hole.x, hole.z + hole.d * 0.5 + frontD * 0.5, hole.w, frontD);
      const trimPieces = [
        { x: hole.x, z: hole.z - hole.d * 0.5, w: hole.w + 0.24, d: 0.12 },
        { x: hole.x, z: hole.z + hole.d * 0.5, w: hole.w + 0.24, d: 0.12 },
        { x: hole.x - hole.w * 0.5, z: hole.z, w: 0.12, d: hole.d + 0.24 },
        { x: hole.x + hole.w * 0.5, z: hole.z, w: 0.12, d: hole.d + 0.24 },
      ];
      trimPieces.forEach((piece) => addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(piece.w, 0.12, piece.d), beamMat), piece.x, floorY + 0.02, piece.z));
    };
    const addRail = (floorY, w, d) => {
      const y = floorY + 0.68;
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(w - 1.0, 0.14, 0.12), beamMat), 0, y, -d * 0.5 + 0.32);
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.14, 0.12), beamMat), -w * 0.33, y, d * 0.5 - 0.32);
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.14, 0.12), beamMat), w * 0.33, y, d * 0.5 - 0.32);
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, d - 0.86), beamMat), -w * 0.5 + 0.32, y, 0);
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, d - 0.86), beamMat), w * 0.5 - 0.32, y, 0);
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = -w * 0.36 + t * w * 0.72;
        addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), trimMat), x, floorY + 0.38, -d * 0.5 + 0.32);
      }
      for (let i = 0; i < 4; i++) {
        const z = -d * 0.25 + i * d * 0.17;
        addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), trimMat), -w * 0.5 + 0.32, floorY + 0.36, z);
        addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.07), trimMat), w * 0.5 - 0.32, floorY + 0.36, z);
      }
    };
    const addLattice = (floorY, w, d, level) => {
      const y = floorY + 1.18;
      const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.86, 0.08), paperMat);
      addPagodaPiece(back, 0, y, -d * 0.5 + 0.08);
      for (let i = -2; i <= 2; i++) {
        addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.96, 0.1), beamMat), i * w * 0.1, y, -d * 0.5 + 0.14);
      }
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.07, 0.11), beamMat), 0, y + 0.32, -d * 0.5 + 0.15);
      addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.07, 0.11), beamMat), 0, y - 0.32, -d * 0.5 + 0.15);
      for (const sx of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, d * 0.34), paperMat);
        addPagodaPiece(panel, sx * (w * 0.5 - 0.08), y, -d * 0.12);
        for (let i = -1; i <= 1; i++) {
          addPagodaPiece(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), beamMat), sx * (w * 0.5 - 0.14), y, -d * 0.12 + i * d * 0.11);
        }
      }
      if (level === 0) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.08), trimMat);
        addPagodaPiece(sign, 0, floorY + 1.55, d * 0.5 + 0.16);
        const ink = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.09), mats.dark);
        addPagodaPiece(ink, 0, floorY + 1.55, d * 0.5 + 0.22);
      }
    };
    const addRoof = (roofY, w, d, level) => {
      const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 1.85, 0.16, d + 1.85), trimMat);
      addPagodaPiece(eave, 0, roofY, 0);
      const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.74, 0.78, 4), roofMat);
      lowerRoof.rotation.y = Math.PI / 4;
      lowerRoof.scale.z = d / w;
      addPagodaPiece(lowerRoof, 0, roofY + 0.36, 0);
      const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.5, 0.46, 4), mat(0xa92d2d));
      upperRoof.rotation.y = Math.PI / 4;
      upperRoof.scale.z = d / w;
      addPagodaPiece(upperRoof, 0, roofY + 0.72, 0);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 4), trimMat);
          corner.rotation.y = Math.PI / 4;
          addPagodaPiece(corner, sx * (w * 0.5 + 0.72), roofY + 0.36, sz * (d * 0.5 + 0.72));
        }
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.65, 0.16, 0.18), beamMat);
      addPagodaPiece(beam, 0, roofY - 0.22, d * 0.5 + 0.14);
      const rearBeam = beam.clone();
      addPagodaPiece(rearBeam, 0, roofY - 0.22, -d * 0.5 - 0.14);
      if (level === 2) {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.45, 8), trimMat);
        addPagodaPiece(crown, 0, roofY + 1.22, 0);
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), trimMat);
        addPagodaPiece(pearl, 0, roofY + 2.05, 0);
      }
    };
    const addFloor = (floorY, w, d, level, hole = null) => {
      addSplitDeck(floorY, w, d, hole);
      const wallH = 1.78;
      addRail(floorY, w, d);
      addLattice(floorY, w, d, level);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, wallH + 0.32, 8), beamMat);
          addPagodaPiece(pillar, sx * (w * 0.5 - 0.34), floorY + wallH * 0.5, sz * (d * 0.5 - 0.34));
        }
      }
      for (const x of [-w * 0.22, w * 0.22]) addLantern(x, floorY + 1.52, d * 0.5 + 0.34);
      addRoof(floorY + wallH + 0.2, w, d, level);
      if (level === 0) {
        const matTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.82), mats.wood);
        addPagodaPiece(matTop, 0.8, floorY + 0.34, -1.1);
        const scroll = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.52), mat(0xf6e4b5));
        addPagodaPiece(scroll, 0.8, floorY + 0.46, -1.1);
      }
    };
    const addStairs = (startY, endY, startX, endX, startZ, endZ, rot = 0) => {
      const steps = 12;
      const addStairLanding = (x, z, y) => {
        const landing = new THREE.Mesh(new THREE.BoxGeometry(rot ? 1.12 : 1.72, 0.16, rot ? 1.72 : 1.12), mats.wood);
        landing.rotation.y = rot;
        addPagodaPiece(landing, x, y - 0.08, z);
        addWalkPlatform(px + x, pz + z, rot ? 1.2 : 1.82, rot ? 1.82 : 1.2, y, rot, { maxRise: 1.15 });
      };
      addStairLanding(startX, startZ, startY);
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const x = startX + (endX - startX) * t;
        const z = startZ + (endZ - startZ) * t;
        const y = startY + (endY - startY) * t;
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.18, 0.74), mats.wood);
        step.rotation.y = rot;
        addPagodaPiece(step, x, y + 0.04, z);
        addWalkPlatform(px + x, pz + z, rot ? 0.92 : 1.64, rot ? 1.64 : 0.92, y + 0.15, rot, { maxRise: 1.15 });
      }
      addStairLanding(endX, endZ, endY);
    };
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 8), stoneMat);
    base.scale.set(pagodaW * 0.62, 1, pagodaD * 0.55);
    base.rotation.y = Math.PI / 8;
    addPagodaPiece(base, 0, 2.92, 0);
    addFloor(levelYs[0], pagodaW, pagodaD, 0);
    addFloor(levelYs[1], pagodaW - 1.3, pagodaD - 1.0, 1, { x: -2.55, z: -1.92, w: 1.95, d: 1.9 });
    addFloor(levelYs[2], pagodaW - 2.55, pagodaD - 2.0, 2, { x: 2.2, z: 1.68, w: 1.9, d: 1.85 });
    addStairs(levelYs[0], levelYs[1], -2.55, -2.55, 2.25, -1.92, 0);
    addStairs(levelYs[1], levelYs[2], 2.2, 2.2, -2.05, 1.68, 0);
    const groundLight = new THREE.PointLight(0xffb54f, 0, 12, 1.55);
    groundLight.position.set(0, levelYs[0] + 1.5, 0.2);
    pagoda.add(groundLight);
    const upperLight = new THREE.PointLight(0xffcb73, 0, 9, 1.6);
    upperLight.position.set(0, levelYs[1] + 1.4, 0);
    pagoda.add(upperLight);
    pagodaLights.push(groundLight, upperLight);
    pagoda.position.set(px, 0, pz);
    group.add(pagoda);
    shipNightLights.push({
      group: pagoda,
      material: pagodaGlow,
      haloMaterial: null,
      haloOpacity: 0,
      lights: pagodaLights,
      baseIntensity: 0.75,
    });
    const wallPad = 0.08;
    addCollisionBox(px, pz - pagodaD * 0.5, pagodaW, 0.3, wallPad);
    addCollisionBox(px - pagodaW * 0.5, pz, 0.3, pagodaD, wallPad);
    addCollisionBox(px + pagodaW * 0.5, pz, 0.3, pagodaD, wallPad);
    addCollisionBox(px - pagodaW * 0.34, pz + pagodaD * 0.5, pagodaW * 0.32, 0.3, wallPad);
    addCollisionBox(px + pagodaW * 0.34, pz + pagodaD * 0.5, pagodaW * 0.32, 0.3, wallPad);
  } else if ((data.theme === "fort" || data.theme === "naval") && data.name !== "Crown Harbor") {
    for (let side of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 3.2, 8), mats.rock);
      tower.position.set(side * 5.2, 3.55, -5.2);
      tower.castShadow = true;
      group.add(tower);
      obstacles.push({ x: data.x + side * 5.2, z: data.z - 5.2, r: 1.8 });
      collisionBoxes.push({ x: data.x + side * 5.2, z: data.z - 5.2, w: 3.1, d: 3.1, pad: 0.18 });
    }
  }
  if (data.theme === "starter") {
    const light = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.4, 8.6, 12), mat(0xf6ead0));
    light.position.set(6.8, 6.9, -7.2);
    light.castShadow = true;
    group.add(light);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.9, 12), new THREE.MeshBasicMaterial({ color: 0xfff1a6 }));
    lantern.position.set(6.8, 11.35, -7.2);
    group.add(lantern);
    addCone(6.8, -7.2, 1.55, 1.15, accent, 12.1, 10);
    obstacles.push({ x: data.x + 6.8, z: data.z - 7.2, r: 1.65 });
    collisionBoxes.push({ x: data.x + 6.8, z: data.z - 7.2, w: 2.9, d: 2.9, pad: 0.15 });
  }
  if (data.theme === "iberian") {
    addBlock(4.7, -4.5, 3.2, 3.6, 3.0, 0xf4e5c9);
    addCone(4.7, -4.5, 2.2, 1.4, 0xb84f44, 6.7);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 8, 18, Math.PI), mat(accent));
    arch.position.set(-1.2, 3.65, -7.2);
    arch.rotation.x = Math.PI / 2;
    group.add(arch);
  }
  if (data.theme === "lagoon") {
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.16, 8, 18, Math.PI), mat(0xd7b44a));
    bridge.position.set(3.7, 3.25, 3.0);
    bridge.rotation.x = Math.PI / 2;
    group.add(bridge);
    addCollisionBox(3.7, 3.0, 5.4, 0.7, 0.18);
    addBlock(-5.1, -4.1, 2.5, 2.5, 2.4, 0xe2d0a5);
    addCone(-5.1, -4.1, 1.8, 0.9, accent, 5.3);
  }
  if (data.theme === "trade") {
    addBlock(4.8, -4.0, 4.8, 2.6, 3.2, 0xb77b42);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 7), mats.wood);
    mast.position.set(-5.4, 5.0, -2.6);
    group.add(mast);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.5, 0.16), mat(0xf8f4e5));
    blade.position.set(-5.4, 6.8, -2.6);
    group.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.z = Math.PI / 2;
    group.add(blade2);
    obstacles.push({ x: data.x - 5.4, z: data.z - 2.6, r: 1.2 });
  }
  if (data.theme === "dhow" || data.theme === "market") {
    addTent(4.6, -3.9, accent);
    addTent(1.8, -6.2, 0xf0d05a);
    addTent(6.8, -0.8, 0xda9c5c);
  }
  if (data.theme === "schooner") {
    addBlock(4.8, -4.2, 5.6, 1.0, 2.2, 0xb77b42, 3.0);
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.05 + i * 0.2, 0.055, 6, 12, Math.PI), mats.wood);
      rib.position.set(3.7 + i * 0.9, 3.65, -4.2);
      rib.rotation.x = Math.PI / 2;
      group.add(rib);
    }
  }
  if (data.theme === "atoll") {
    addTent(4.4, -4.0, 0xef6f4f);
    const shell = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 8, 18), mat(0xf8f4e5));
    shell.position.set(-5.2, 3.05, -4.2);
    shell.scale.z = 0.5;
    group.add(shell);
    obstacles.push({ x: data.x - 5.2, z: data.z - 4.2, r: 1.2 });
  }
  const treeCount = data.theme === "atoll" ? 10 : ["norse", "rocky", "naval", "fort", "starter"].includes(data.theme) ? 16 : 11;
  for (let i = 0; i < treeCount; i++) {
    const tree = makeIslandTree(data.theme);
    tree.position.set(Math.cos(i * 1.7) * (radius * 0.28 + Math.random() * radius * 0.22), 2.3, Math.sin(i * 1.7) * (radius * 0.28 + Math.random() * radius * 0.2));
    if (!clearOfNoTreeZones(tree.position.x, tree.position.z, 3.6)) continue;
    tree.scale.setScalar(0.75 + Math.random() * 0.48);
    group.add(tree);
    obstacles.push({ x: data.x + tree.position.x, z: data.z + tree.position.z, r: 1.35 * tree.scale.x });
  }
  for (let i = 0; i < 8; i++) {
    const rockSize = 0.7 + Math.random() * 0.7;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize, 0), mats.rock);
    const rockX = Math.cos(i * 1.9) * (radius * 0.46 + Math.random() * radius * 0.2);
    const rockZ = Math.sin(i * 1.9) * (radius * 0.42 + Math.random() * radius * 0.18);
    rock.position.set(rockX, 2.7, rockZ);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.55 + Math.random() * 0.7;
    rock.position.y = localIslandSurfaceY(rockX, rockZ) + rockSize * rock.scale.y * 0.46;
    rock.castShadow = true;
    group.add(rock);
    obstacles.push({ x: data.x + rock.position.x, z: data.z + rock.position.z, r: 1.1 * Math.max(rock.scale.x, rock.scale.z) });
  }
  const label = makeLabel(islandName(data.name));
  label.position.set(data.x, 12, data.z);
  scene.add(label);
  labels.push(label);
  scene.add(group);
  return {
    ...data,
    group,
    radius,
    landY: 2.9,
    obstacles,
    collisionBoxes,
    terrainFeatures,
    walkPlatforms,
    label,
    dockBox: { x: data.x, z: data.z + dockCenterZ, w: dockWidth + 0.25, d: dockLength + 0.4 },
    dock: new THREE.Vector3(data.x, 0, data.z + radius),
    shop: new THREE.Vector3(data.x + shopLocal.x, 0, data.z + shopLocal.z),
  };
}

function setLabelText(sprite, text) {
  if (!sprite) return;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(16,32,42,.72)";
  ctx.beginPath();
  ctx.roundRect(10, 8, 236, 42, 12);
  ctx.fill();
  ctx.fillStyle = "#fff8df";
  ctx.font = "bold 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 37);
  const texture = new THREE.CanvasTexture(c);
  if (sprite.material?.map) sprite.material.map.dispose();
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  sprite.userData.labelText = text;
}

function makeLabel(text) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: true, depthWrite: false }));
  sprite.scale.set(18, 4.5, 1);
  setLabelText(sprite, text);
  return sprite;
}

function refreshIslandLabels() {
  islands.forEach((island) => {
    if (!island.label) return;
    island.label.visible = shouldShowIslandLabel(island);
    if (island.label.visible) setLabelText(island.label, islandName(island));
  });
}

function buildItemName(id) {
  return BUILD_ITEMS[id]?.name || id;
}

function buildInventoryCount(id) {
  return Math.max(0, Math.floor(Number(state.inventory[id]) || 0));
}

function applyBuildInventory(message) {
  const next = message?.inventory || {};
  BUILD_ITEM_ORDER.forEach((id) => {
    state.inventory[id] = Math.max(0, Math.floor(Number(next[id]) || 0));
  });
  if (message?.bought && BUILD_ITEMS[message.bought]) {
    state.selectedBuildItem = message.bought;
    toast(`Bought ${message.amount || 1} ${buildItemName(message.bought)}.`);
  }
  if (state.selectedBuildItem && buildInventoryCount(state.selectedBuildItem) <= 0) state.selectedBuildItem = null;
  if (!state.infiniteGold && Number.isFinite(Number(message?.gold))) state.gold = Math.max(0, Number(message.gold));
  renderInventory();
  if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
  updateHud();
}

function clearBuildInventory(notifyServer = true) {
  BUILD_ITEM_ORDER.forEach((id) => {
    state.inventory[id] = 0;
  });
  state.selectedBuildItem = null;
  renderInventory();
  if (notifyServer && multiplayer.serverWorld) sendMultiplayer({ type: "clearBuildInventory" });
}

function islandClaimFor(islandOrName) {
  const name = typeof islandOrName === "object" ? islandOrName?.name : islandOrName;
  return name ? islandClaimNames.get(name) || null : null;
}

function playerOwnsIsland(island) {
  const claim = islandClaimFor(island);
  if (!claim) return false;
  return [claim.owner, claim.clientId, claim.sessionId].includes(captainId)
    || [claim.owner, claim.clientId, claim.sessionId].includes(playerId)
    || [claim.owner, claim.clientId, claim.sessionId].includes(multiplayer.networkId);
}

function cleanIslandClaimName(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, 24);
  return cleaned || `${captainName()}'s Isle`;
}

function applyIslandClaim(data) {
  if (!data?.island) return;
  const island = islands.find((item) => item.name === data.island);
  if (!island) return;
  const claim = {
    island: island.name,
    name: cleanIslandClaimName(data.name),
    owner: data.owner || data.clientId || data.sessionId || "",
    clientId: data.clientId || "",
    sessionId: data.sessionId || "",
    ownerName: data.ownerName || data.captain || "",
  };
  islandClaimNames.set(island.name, claim);
  if (island.label) {
    island.label.visible = true;
    setLabelText(island.label, islandName(island));
  }
  if (state.dockedAt === island.name) updateHud();
}

function syncIslandClaims(claims = []) {
  islandClaimNames.clear();
  (Array.isArray(claims) ? claims : []).forEach((claim) => applyIslandClaim(claim));
  refreshIslandLabels();
  renderInventory();
  if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
}

function localPointInRotatedRect(point, rect, pad = 0) {
  const dx = point.x - rect.x;
  const dz = point.z - rect.z;
  const rot = rect.rot || 0;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return Math.abs(localX) <= rect.w * 0.5 + pad && Math.abs(localZ) <= rect.d * 0.5 + pad;
}

function rotateBuildLocal(local, rotation) {
  const cos = Math.cos(rotation || 0);
  const sin = Math.sin(rotation || 0);
  return {
    x: local.x * cos + local.z * sin,
    z: -local.x * sin + local.z * cos,
  };
}

function islandLobeNormalized(island, lobe, point, margin = 0) {
  const rx = Math.max(0.2, lobe.rx - margin);
  const rz = Math.max(0.2, lobe.rz - margin);
  const dx = point.x - island.group.position.x - lobe.x;
  const dz = point.z - island.group.position.z - lobe.z;
  const rot = lobe.rot || 0;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return (localX * localX) / (rx * rx) + (localZ * localZ) / (rz * rz);
}

function pointInIslandLobe(island, lobe, point, margin = 0) {
  return islandLobeNormalized(island, lobe, point, margin) <= 1;
}

function islandSurfaceContains(island, point, margin = 0) {
  if (!island) return false;
  if (island.surfaceLobes?.length) {
    return island.surfaceLobes.some((lobe) => pointInIslandLobe(island, lobe, point, margin));
  }
  return dist2(point, island.group.position) <= island.radius - margin;
}

function islandFootprintContains(island, point, margin = 0) {
  if (!island) return false;
  if (island.surfaceLobes?.length) {
    return island.surfaceLobes.some((lobe) => pointInIslandLobe(island, lobe, point, -margin));
  }
  return dist2(point, island.group.position) <= island.radius + margin;
}

function islandDockPointRadius(island) {
  if (!island) return 0;
  const shipPadding = state.mode === "ship" ? shipCollisionRadius(state.shipType) * 0.35 : 0;
  if (island.exploreOnly) return clamp(island.radius * 0.22 + shipPadding, 5.5, 11.5);
  return state.mode === "ship" ? 18 : 16;
}

function islandDockShoreMargin(island) {
  if (!island) return 0;
  if (island.exploreOnly) {
    const shipPadding = state.mode === "ship" ? shipCollisionRadius(state.shipType) * 0.52 : 0;
    return state.mode === "ship"
      ? clamp(island.radius * 0.08 + shipPadding + 2.2, 4.2, 10.5)
      : 1.8;
  }
  return state.mode === "ship" ? 12 : 2;
}

function islandDockContains(island, point) {
  if (!island || !point) return false;
  if (dist2(point, island.dock) < islandDockPointRadius(island)) return true;
  if (island.surfaceLobes?.length) return islandFootprintContains(island, point, islandDockShoreMargin(island));
  return dist2(point, island.group.position) < island.radius + islandDockShoreMargin(island);
}

function addBuildingMeshPart(group, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function makeBuildingMesh(piece) {
  const group = new THREE.Group();
  const type = piece.type || "floor";
  const wood = mats.plank;
  const darkWood = mats.wood;
  const cloth = mat(0xd84c3f);
  if (type === "floor") {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, BUILD_FLOOR_THICKNESS, BUILD_GRID_SIZE), wood);
    floor.position.y = BUILD_FLOOR_THICKNESS * 0.5;
    addBuildingMeshPart(group, floor);
  } else if (type === "wall") {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, 2.35, BUILD_WALL_DEPTH), wood);
    wall.position.y = 1.18;
    addBuildingMeshPart(group, wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.16, BUILD_WALL_CAP_DEPTH), darkWood);
    cap.position.y = 2.42;
    addBuildingMeshPart(group, cap);
  } else if (type === "cornerWall") {
    const wallA = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, 2.35, BUILD_WALL_DEPTH), wood);
    wallA.position.set(BUILD_GRID_SIZE * 0.25, 1.18, -BUILD_GRID_SIZE * 0.25);
    addBuildingMeshPart(group, wallA);
    const capA = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.16, BUILD_WALL_CAP_DEPTH), darkWood);
    capA.position.set(BUILD_GRID_SIZE * 0.25, 2.42, -BUILD_GRID_SIZE * 0.25);
    addBuildingMeshPart(group, capA);
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(BUILD_WALL_DEPTH, 2.35, BUILD_GRID_SIZE), wood);
    wallB.position.set(-BUILD_GRID_SIZE * 0.25, 1.18, BUILD_GRID_SIZE * 0.25);
    addBuildingMeshPart(group, wallB);
    const capB = new THREE.Mesh(new THREE.BoxGeometry(BUILD_WALL_CAP_DEPTH, 0.16, BUILD_GRID_SIZE), darkWood);
    capB.position.set(-BUILD_GRID_SIZE * 0.25, 2.42, BUILD_GRID_SIZE * 0.25);
    addBuildingMeshPart(group, capB);
    const post = new THREE.Mesh(new THREE.BoxGeometry(BUILD_WALL_CAP_DEPTH, 2.55, BUILD_WALL_CAP_DEPTH), darkWood);
    post.position.set(-BUILD_GRID_SIZE * 0.25, 1.28, -BUILD_GRID_SIZE * 0.25);
    addBuildingMeshPart(group, post);
  } else if (type === "door") {
    for (const x of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.35, BUILD_WALL_DEPTH), wood);
      post.position.set(x * 1.28, 1.18, 0);
      addBuildingMeshPart(group, post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE, 0.42, BUILD_WALL_CAP_DEPTH), darkWood);
    lintel.position.y = 2.28;
    addBuildingMeshPart(group, lintel);
  } else if (type === "roof") {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(BUILD_GRID_SIZE * 0.82, 1.1, 4), mat(0xb45f3f));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.76;
    addBuildingMeshPart(group, roof);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(BUILD_GRID_SIZE * 1.06, 0.16, BUILD_GRID_SIZE * 1.06), darkWood);
    deck.position.y = 0.12;
    addBuildingMeshPart(group, deck);
  } else if (type === "table") {
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.22, 1.25), darkWood);
    top.position.y = 0.9;
    addBuildingMeshPart(group, top);
    for (const x of [-0.82, 0.82]) {
      for (const z of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 0.18), mats.wood);
        leg.position.set(x, 0.44, z);
        addBuildingMeshPart(group, leg);
      }
    }
  } else {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 7), mats.wood);
    pole.position.y = 1.6;
    addBuildingMeshPart(group, pole);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 1.28), cloth);
    banner.position.set(0, 2.48, 0.62);
    addBuildingMeshPart(group, banner);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.22, 8), mats.rock);
    base.position.y = 0.11;
    addBuildingMeshPart(group, base);
  }
  group.position.set(Number(piece.x) || 0, Number(piece.y) || 0, Number(piece.z) || 0);
  group.rotation.y = Number(piece.rotation) || 0;
  return group;
}

function removeBuildingPiece(piece) {
  if (!piece) return;
  scene.remove(piece.group);
  buildingPieces.splice(buildingPieces.indexOf(piece), 1);
  buildingPieceMap.delete(piece.id);
}

function buildingPieceIsMine(piece) {
  if (!piece) return false;
  return [piece.owner, piece.clientId, piece.sessionId].includes(captainId)
    || [piece.owner, piece.clientId, piece.sessionId].includes(playerId)
    || [piece.owner, piece.clientId, piece.sessionId].includes(multiplayer.networkId);
}

function removeBuildingPieceById(id) {
  const piece = buildingPieceMap.get(id);
  if (piece) removeBuildingPiece(piece);
}

function upsertBuildingPiece(data) {
  if (!data?.id || !BUILD_ITEMS[data.type]) return;
  const islandNameValue = data.island || data.islandName;
  const island = islands.find((item) => item.name === islandNameValue);
  if (!island) return;
  const piece = {
    id: data.id,
    island: island.name,
    type: data.type,
    x: Number(data.x) || island.group.position.x,
    y: Number.isFinite(Number(data.y)) ? Number(data.y) : island.landY,
    z: Number(data.z) || island.group.position.z,
    rotation: Number(data.rotation) || 0,
    owner: data.owner || "",
    clientId: data.clientId || "",
    sessionId: data.sessionId || "",
  };
  const existing = buildingPieceMap.get(piece.id);
  if (existing) {
    Object.assign(existing, piece);
    existing.group.position.set(piece.x, piece.y, piece.z);
    existing.group.rotation.y = piece.rotation;
    return;
  }
  piece.group = makeBuildingMesh(piece);
  scene.add(piece.group);
  buildingPieces.push(piece);
  buildingPieceMap.set(piece.id, piece);
}

function syncBuildingPieces(items = []) {
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item?.id) return;
    seen.add(item.id);
    upsertBuildingPiece(item);
  });
  buildingPieces.slice().forEach((piece) => {
    if (!seen.has(piece.id)) removeBuildingPiece(piece);
  });
}

function buildingSurfaceYAt(island, point, baseY) {
  let y = baseY;
  buildingPieces.forEach((piece) => {
    if (piece.island !== island.name) return;
    const type = piece.type;
    if (type !== "floor" && type !== "roof") return;
    const surfaceY = piece.y + (type === "floor" ? BUILD_FLOOR_SURFACE_Y : 2.36);
    const currentY = Number.isFinite(point.y) ? point.y : y;
    if (surfaceY - currentY > 1.35) return;
    if (localPointInRotatedRect(point, { x: piece.x, z: piece.z, w: BUILD_GRID_SIZE * 1.08, d: BUILD_GRID_SIZE * 1.08, rot: piece.rotation }, 0.08)) {
      y = Math.max(y, surfaceY);
    }
  });
  return y;
}

function buildingSupportTopY(piece, placementType) {
  if (!piece) return null;
  if (piece.type === "floor" && placementType !== "roof") return piece.y + BUILD_FLOOR_SURFACE_Y;
  if (placementType === "roof" && (piece.type === "wall" || piece.type === "door" || piece.type === "cornerWall")) {
    return piece.y + 2.54;
  }
  return null;
}

function buildingSupportsPlacement(supportType, placementType) {
  if (placementType === "flag") return false;
  if (placementType === "roof") return supportType === "wall" || supportType === "door" || supportType === "cornerWall";
  return supportType === "floor";
}

function buildingSupportRects(piece, placementType) {
  const rot = piece.rotation || 0;
  if (piece.type === "floor" && placementType !== "roof") {
    return [{ x: piece.x, z: piece.z, w: BUILD_GRID_SIZE * 1.06, d: BUILD_GRID_SIZE * 1.06, rot }];
  }
  if (piece.type === "wall" || piece.type === "door") {
    return [{ x: piece.x, z: piece.z, w: BUILD_GRID_SIZE, d: BUILD_WALL_CAP_DEPTH, rot }];
  }
  if (piece.type === "cornerWall") {
    return [
      { x: piece.x + Math.cos(rot) * BUILD_GRID_SIZE * 0.25, z: piece.z - Math.sin(rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_GRID_SIZE, d: BUILD_WALL_CAP_DEPTH, rot },
      { x: piece.x - Math.sin(rot) * BUILD_GRID_SIZE * 0.25, z: piece.z + Math.cos(rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_WALL_CAP_DEPTH, d: BUILD_GRID_SIZE, rot },
    ];
  }
  return [];
}

function buildStackSupportAt(island, point, type, rotation) {
  if (type === "flag") return null;
  let best = null;
  const pointY = Number.isFinite(point.y) ? point.y : island.landY;
  const maxRise = type === "roof" ? 3.35 : 1.4;
  const maxDrop = type === "roof" ? 1.8 : 0.82;
  buildingPieces.forEach((piece) => {
    if (piece.island !== island.name || !buildingPieceIsMine(piece)) return;
    if (!buildingSupportsPlacement(piece.type, type)) return;
    const topY = buildingSupportTopY(piece, type);
    if (!Number.isFinite(topY)) return;
    if (topY - pointY > maxRise || pointY - topY > maxDrop) return;
    const pad = type === "roof" ? 0.72 : 0.38;
    if (!buildingSupportRects(piece, type).some((rect) => localPointInRotatedRect(point, rect, pad))) return;
    const distance = Math.hypot(point.x - piece.x, point.z - piece.z);
    if (best && (topY < best.y - 0.05 || (Math.abs(topY - best.y) < 0.05 && distance >= best.distance))) return;
    best = {
      piece,
      x: type === "roof" ? piece.x : point.x,
      y: topY,
      z: type === "roof" ? piece.z : point.z,
      rotation: type === "roof" ? (piece.rotation || 0) : rotation,
      distance,
    };
  });
  return best;
}

function buildPlacementSurfaceYAt(island, point, type, rotation) {
  const stack = buildStackSupportAt(island, point, type, rotation);
  if (stack) return stack.y;
  if (type === "roof") return null;
  return islandGroundY(island, point);
}

function buildingCollisionBoxes(piece) {
  const base = { x: piece.x, z: piece.z, rot: piece.rotation || 0, minY: piece.y - 0.15, maxY: piece.y + 2.7 };
  if (piece.type === "wall") return [{ ...base, w: BUILD_GRID_SIZE, d: BUILD_WALL_DEPTH, solidWall: true }];
  if (piece.type === "cornerWall") {
    return [
      { ...base, x: piece.x + Math.cos(base.rot) * BUILD_GRID_SIZE * 0.25, z: piece.z - Math.sin(base.rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_GRID_SIZE, d: BUILD_WALL_DEPTH, solidWall: true },
      { ...base, x: piece.x - Math.sin(base.rot) * BUILD_GRID_SIZE * 0.25, z: piece.z + Math.cos(base.rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_WALL_DEPTH, d: BUILD_GRID_SIZE, solidWall: true },
    ];
  }
  if (piece.type === "door") {
    return [
      { ...base, x: piece.x + Math.cos(base.rot) * 1.28, z: piece.z - Math.sin(base.rot) * 1.28, w: 0.62, d: BUILD_WALL_DEPTH, solidWall: true },
      { ...base, x: piece.x - Math.cos(base.rot) * 1.28, z: piece.z + Math.sin(base.rot) * 1.28, w: 0.62, d: BUILD_WALL_DEPTH, solidWall: true },
    ];
  }
  if (piece.type === "table") return [{ ...base, w: 2.25, d: 1.25, maxY: piece.y + 1.1 }];
  if (piece.type === "flag") return [{ ...base, w: 0.85, d: 0.85, maxY: piece.y + 3.2 }];
  return [];
}

function pointBlockedByBuildings(island, point, options = {}) {
  return buildingPieces.some((piece) => {
    if (piece.island !== island.name) return false;
    const pointY = Number.isFinite(point.y) ? point.y : island.landY;
    if (options.ignoreSupportForType && buildingSupportsPlacement(piece.type, options.ignoreSupportForType)) {
      const topY = buildingSupportTopY(piece, options.ignoreSupportForType);
      if (Number.isFinite(topY) && Math.abs(pointY - topY) < 0.86) return false;
    }
    return buildingCollisionBoxes(piece).some((box) => {
      if (pointY < box.minY || (!box.solidWall && pointY > box.maxY)) return false;
      return localPointInRotatedRect(point, box, 0.2);
    });
  });
}

function buildSnapSockets(type) {
  const half = BUILD_GRID_SIZE * 0.5;
  if (type === "wall" || type === "door") {
    return [
      { x: -half, z: 0 },
      { x: half, z: 0 },
    ];
  }
  if (type === "cornerWall") {
    return [
      { x: -BUILD_GRID_SIZE * 0.25, z: -BUILD_GRID_SIZE * 0.25 },
      { x: BUILD_GRID_SIZE * 0.75, z: -BUILD_GRID_SIZE * 0.25 },
      { x: -BUILD_GRID_SIZE * 0.25, z: BUILD_GRID_SIZE * 0.75 },
    ];
  }
  if (type === "floor" || type === "roof") {
    return [
      { x: -half, z: 0 },
      { x: half, z: 0 },
      { x: 0, z: -half },
      { x: 0, z: half },
    ];
  }
  return [];
}

function snapSocketWorld(piece, socket, rotation = piece.rotation || 0) {
  const offset = rotateBuildLocal(socket, rotation);
  return { x: piece.x + offset.x, z: piece.z + offset.z };
}

function buildFootprintSnapPoints(footprint) {
  const halfW = footprint.w * 0.5;
  const halfD = footprint.d * 0.5;
  const locals = [
    { x: -halfW, z: -halfD, kind: "vertex" },
    { x: halfW, z: -halfD, kind: "vertex" },
    { x: halfW, z: halfD, kind: "vertex" },
    { x: -halfW, z: halfD, kind: "vertex" },
    { x: 0, z: -halfD, kind: "edge" },
    { x: halfW, z: 0, kind: "edge" },
    { x: 0, z: halfD, kind: "edge" },
    { x: -halfW, z: 0, kind: "edge" },
  ];
  return locals.map((local) => {
    const offset = rotateBuildLocal(local, footprint.rot || 0);
    return {
      x: footprint.x + offset.x,
      z: footprint.z + offset.z,
      localX: local.x,
      localZ: local.z,
      kind: local.kind,
    };
  });
}

function buildFootprintsOverlap(a, b, pad = 0.02) {
  const corners = (rect) => buildFootprintSnapPoints(rect).slice(0, 4);
  const axes = (rect) => {
    const rot = rect.rot || 0;
    return [
      { x: Math.cos(rot), z: -Math.sin(rot) },
      { x: Math.sin(rot), z: Math.cos(rot) },
    ];
  };
  const project = (points, axis) => {
    let min = Infinity;
    let max = -Infinity;
    points.forEach((point) => {
      const value = point.x * axis.x + point.z * axis.z;
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
    return { min, max };
  };
  const aCorners = corners(a);
  const bCorners = corners(b);
  return axes(a).concat(axes(b)).every((axis) => {
    const ap = project(aCorners, axis);
    const bp = project(bCorners, axis);
    return Math.min(ap.max, bp.max) - Math.max(ap.min, bp.min) > pad;
  });
}

function snapBuildByFootprints(island, point, type, rotation) {
  const previewFootprints = buildPlacementFootprints(type, point, rotation);
  if (!previewFootprints.length) return null;
  let best = null;
  const rotationChoices = [rotation];
  let nearestPiece = null;
  let nearestDistance = Infinity;
  buildingPieces.forEach((piece) => {
    if (piece.island !== island.name) return;
    const distance = Math.hypot(point.x - piece.x, point.z - piece.z);
    if (distance >= nearestDistance) return;
    nearestPiece = piece;
    nearestDistance = distance;
  });
  if (!nearestPiece) return null;
  [nearestPiece].forEach((piece) => {
    const existingFootprints = buildPlacementFootprints(piece.type, piece, piece.rotation || 0);
    if (!existingFootprints.length) return;
    rotationChoices.forEach((candidateRotation) => {
      const candidateFootprints = buildPlacementFootprints(type, point, candidateRotation);
      existingFootprints.forEach((existingFootprint) => {
        const existingPoints = buildFootprintSnapPoints(existingFootprint);
        candidateFootprints.forEach((candidateFootprint) => {
          const candidatePoints = buildFootprintSnapPoints(candidateFootprint);
          existingPoints.forEach((existingPoint) => {
            candidatePoints.forEach((candidatePoint) => {
              const snapped = {
                x: point.x + existingPoint.x - candidatePoint.x,
                z: point.z + existingPoint.z - candidatePoint.z,
              };
              const moved = Math.hypot(snapped.x - point.x, snapped.z - point.z);
              const snappedFootprint = {
                ...candidateFootprint,
                x: candidateFootprint.x + snapped.x - point.x,
                z: candidateFootprint.z + snapped.z - point.z,
              };
              if (buildFootprintsOverlap(snappedFootprint, existingFootprint)) return;
              const edgeMatch = existingPoint.kind === "edge" && candidatePoint.kind === "edge";
              const vertexMatch = existingPoint.kind === "vertex" && candidatePoint.kind === "vertex";
              const kindBonus = edgeMatch ? 0 : vertexMatch ? 0.42 : 0.72;
              const score = moved + kindBonus;
              if (best && score >= best.score) return;
              best = { point: snapped, rotation: candidateRotation, score };
            });
          });
        });
      });
    });
  });
  return best;
}

function snapBuildPlacement(island, point, type, rotation) {
  const result = { point, rotation };
  if (!state.buildSnap || type === "flag") return result;
  const stack = buildStackSupportAt(island, point, type, rotation);
  if (stack) {
    point.x = stack.x;
    point.y = stack.y;
    point.z = stack.z;
    result.rotation = stack.rotation;
    result.stack = stack;
    if (type === "roof") return result;
    rotation = result.rotation;
  }
  const footprintSnap = snapBuildByFootprints(island, point, type, rotation);
  if (footprintSnap) {
    point.x = footprintSnap.point.x;
    point.z = footprintSnap.point.z;
    result.rotation = footprintSnap.rotation;
    return result;
  }
  return result;
}

function cardinalBuildLookRotation() {
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  look.y = 0;
  const yaw = look.lengthSq() > 0.0001
    ? Math.atan2(look.x, look.z)
    : character.rotation.y;
  return Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2);
}

function buildRotationForType(type) {
  if (type === "flag") return 0;
  return cardinalBuildLookRotation() + state.buildRotationOffset;
}

function rotateSelectedBuildItem() {
  if (!state.selectedBuildItem) {
    toast("Select a building piece first.");
    return;
  }
  state.buildRotationOffset = (state.buildRotationOffset - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  updateBuildPreview(true);
  toast("Building rotated.");
}

function itemInventoryCount(id) {
  if (id === "cursedCompass") return hasCursedCompass() ? 1 : 0;
  return Math.max(0, Math.floor(Number(state.items?.[id]) || 0));
}

function hasCursedCompass() {
  return Boolean(state.items?.cursedCompass);
}

function setCursedCompassOwned(owned, owner = null) {
  state.items.cursedCompass = Boolean(owned);
  if (owned) state.cursedCompassOwner = owner || multiplayer.networkId || playerId || captainId;
  else if (!owner || [state.cursedCompassOwner, multiplayer.networkId, playerId, captainId].includes(owner)) state.cursedCompassOwner = null;
  renderInventory();
  if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
}

function tortugaBonusCrateCount(shipType = state.shipType) {
  const spec = getShipStats(shipType);
  return spec?.tortugaBonusCrate || TORTUGA_BONUS_SHIPS.has(spec?.id || shipType) ? 1 : 0;
}

function renderInventory() {
  if (!ui.inventoryBody) return;
  ui.inventoryPanel?.classList.toggle("hidden", !state.inventoryOpen);
  const itemRows = Object.values(SHOP_ITEMS).map((item) => {
    const count = itemInventoryCount(item.id);
    return `<div class="inventory-item"><div><h3>${escapeMarkup(item.name)} <span class="price">x${count}</span></h3><p>${escapeMarkup(item.description)}</p></div></div>`;
  }).join("") || `<p class="stats">No special items.</p>`;
  ui.inventoryBody.innerHTML = `<div class="inventory-section-title">Items</div>${itemRows}`;
}

function setInventoryOpen(open) {
  state.inventoryOpen = Boolean(open);
  renderInventory();
}

function forgeCompassPathActive(position = playerShip?.position || state.position) {
  if (!hasCursedCompass() || !position) return false;
  const x = Number(position.x) || 0;
  const z = Number(position.z) || 0;
  const distanceToWaterfall = Math.hypot(x - FORGE_WATERFALL.x, z - FORGE_WATERFALL.z);
  if (distanceToWaterfall <= COMPASS_TRAIL_SAFE_RADIUS) return true;
  const startX = 0;
  const startZ = MINIMAP_VISIBLE_LIMIT * 0.72;
  const routeX = FORGE_WATERFALL.x - startX;
  const routeZ = FORGE_WATERFALL.z - startZ;
  const lenSq = Math.max(1, routeX * routeX + routeZ * routeZ);
  const t = clamp(((x - startX) * routeX + (z - startZ) * routeZ) / lenSq, 0, 1);
  const closestX = startX + routeX * t;
  const closestZ = startZ + routeZ * t;
  return Math.hypot(x - closestX, z - closestZ) <= 78
    && Math.hypot(x - FORGE_WATERFALL.x, z - FORGE_WATERFALL.z) <= COMPASS_TRAIL_SAFE_RADIUS + 260;
}

function forgeTopWaterfallPoint() {
  const forge = islands.find((item) => item.name === "Forge");
  if (!forge) return new THREE.Vector3(FORGE_WORLD.x, FORGE_ELEVATION + 3, FORGE_WORLD.z);
  const inward = forge.group.position.clone().sub(new THREE.Vector3(FORGE_WATERFALL.x, forge.landY, FORGE_WATERFALL.z));
  inward.y = 0;
  if (inward.lengthSq() < 0.01) inward.set(0, 0, -1);
  inward.normalize();
  return new THREE.Vector3(FORGE_WATERFALL.x, forge.landY + 0.18, FORGE_WATERFALL.z).add(inward.multiplyScalar(6));
}

function forgeBaseWaterfallPoint() {
  const away = new THREE.Vector3(FORGE_WATERFALL.x - FORGE_WORLD.x, 0, FORGE_WATERFALL.z - FORGE_WORLD.z);
  if (away.lengthSq() < 0.01) away.set(0, 0, 1);
  away.normalize();
  return new THREE.Vector3(FORGE_WATERFALL.x, 0.1, FORGE_WATERFALL.z).add(away.multiplyScalar(7));
}

function startForgeWaterfallTransit(direction) {
  if (!hasCursedCompass()) return toast("The Cursed Compass is needed to find this waterfall.");
  if (state.forgeWaterfallTransit) return;
  const forge = islands.find((item) => item.name === "Forge");
  if (!forge) return;
  const top = forgeTopWaterfallPoint();
  const base = forgeBaseWaterfallPoint();
  if (direction === "up") {
    if (state.viewMode !== "swim") return;
    if (Math.hypot(character.position.x - FORGE_WATERFALL.x, character.position.z - FORGE_WATERFALL.z) > 16) return toast("Swim closer to the Forge waterfall.");
    state.forgeWaterfallTransit = {
      direction: "up",
      elapsed: 0,
      duration: 5.2,
      start: character.position.clone(),
      end: top,
    };
    toast("Swimming up the Forge waterfall...");
    return;
  }
  if (direction === "down") {
    if (state.mode !== "land" || state.dockedAt !== "Forge") return;
    if (Math.hypot(character.position.x - top.x, character.position.z - top.z) > 18) return toast("Walk closer to the waterfall.");
    closeForgePanel();
    state.forgeWaterfallTransit = {
      direction: "down",
      elapsed: 0,
      duration: 4.2,
      start: character.position.clone(),
      end: base,
    };
    toast("Swimming down the Forge waterfall...");
  }
}

function finishForgeWaterfallTransit(transit) {
  const forge = islands.find((item) => item.name === "Forge");
  state.forgeWaterfallTransit = null;
  if (transit.direction === "up" && forge) {
    state.mode = "land";
    state.viewMode = "ship";
    state.dockedAt = "Forge";
    state.docking = null;
    state.velocity.set(0, 0, 0);
    closeShop();
    closeForgePanel();
    resetCharacterHealth();
    const top = forgeTopWaterfallPoint();
    character.position.copy(top);
    character.rotation.y = Math.atan2(forge.group.position.x - top.x, forge.group.position.z - top.z);
    character.visible = true;
    state.walkingPos.copy(character.position);
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
    toast("You reached the Forge.");
    updateHud();
    return;
  }
  if (transit.direction === "down") {
    state.mode = "ship";
    state.viewMode = "ship";
    state.dockedAt = null;
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = false;
    resetCharacterHealth();
    character.position.copy(forgeBaseWaterfallPoint());
    character.visible = false;
    playerShip.visible = true;
    state.position.copy(playerShip.position);
    toast("You slid down the Forge waterfall.");
    updateHud();
  }
}

function updateForgeWaterfallTransit(dt) {
  const transit = state.forgeWaterfallTransit;
  if (!transit) return false;
  keys.clear();
  transit.elapsed += dt;
  const t = clamp(transit.elapsed / transit.duration, 0, 1);
  const eased = t * t * (3 - 2 * t);
  if (transit.direction === "up") {
    const xzT = smoothStep((t - 0.84) / 0.16);
    character.position.set(
      transit.start.x + (transit.end.x - transit.start.x) * xzT,
      transit.start.y + (transit.end.y - transit.start.y) * eased,
      transit.start.z + (transit.end.z - transit.start.z) * xzT,
    );
  } else {
    character.position.lerpVectors(transit.start, transit.end, eased);
  }
  const bob = Math.sin(t * Math.PI * 8) * 0.28;
  character.position.y += bob;
  character.visible = true;
  state.velocity.set(0, 0, 0);
  state.walkVelocityY = 0;
  state.walkHeight = 0;
  state.grounded = false;
  if (t >= 1) finishForgeWaterfallTransit(transit);
  return true;
}

function ascendForgeWaterfall() {
  startForgeWaterfallTransit("up");
  return Boolean(state.forgeWaterfallTransit);
}

function updateCursedCompassTrail() {
  if (!compassTrailGroup) return;
  const show = state.joined && hasCursedCompass();
  compassTrailGroup.visible = show;
  if (!show) return;
  const origin = (state.mode === "land" || state.viewMode === "deck" || state.viewMode === "swim") ? character.position : playerShip.position;
  const target = new THREE.Vector3(FORGE_WATERFALL.x, 0.06, FORGE_WATERFALL.z);
  if (Math.hypot(origin.x - FORGE_WATERFALL.x, origin.z - FORGE_WATERFALL.z) < 38) target.set(FORGE_WORLD.x, 0.06, FORGE_WORLD.z);
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  const dirX = distance > 0.001 ? dx / distance : 0;
  const dirZ = distance > 0.001 ? dz / distance : 1;
  const angle = Math.atan2(dirX, dirZ);
  const visibleLength = clamp(distance - 10, 18, 280);
  const spacing = visibleLength / COMPASS_TRAIL_SEGMENTS;
  compassTrailSegments.forEach((segment, index) => {
    const t = (index + 0.5) / COMPASS_TRAIL_SEGMENTS;
    const offset = 8 + t * visibleLength;
    segment.visible = offset < distance - 5;
    segment.position.set(origin.x + dirX * offset, 0.055, origin.z + dirZ * offset);
    segment.rotation.set(-Math.PI / 2, 0, -angle);
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.2 - index * 0.42);
    segment.scale.set(4.8 + pulse * 1.35, Math.max(4.5, spacing * 0.72), 1);
    segment.material.opacity = 0.22 + pulse * 0.28;
  });
  compassTrailGroup.children.forEach((child) => {
    if (!child.userData.compassTrailEnd) return;
    child.position.set(target.x, 0.07, target.z);
    const scale = 0.88 + Math.sin(clock.elapsedTime * 2.6) * 0.08;
    child.scale.setScalar(scale);
    child.visible = distance > 18;
  });
}

function worldFaceNormal(hit) {
  if (!hit?.face?.normal || !hit.object?.matrixWorld) return new THREE.Vector3(0, 1, 0);
  return hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
}

function buildAimBuildingSurface(island, type) {
  if (type === "flag") return null;
  const hits = [];
  buildingPieces.forEach((piece) => {
    if (piece.island !== island.name || !buildingPieceIsMine(piece)) return;
    if (!buildingSupportsPlacement(piece.type, type)) return;
    const hit = raycaster.intersectObject(piece.group, true)[0];
    if (!hit || hit.distance > BUILD_PLACE_MAX_DISTANCE) return;
    const normal = worldFaceNormal(hit);
    const topY = buildingSupportTopY(piece, type);
    const closeToTop = Number.isFinite(topY) && Math.abs(hit.point.y - topY) < 0.36;
    if (type !== "roof" && normal.y < 0.32 && !closeToTop) return;
    hits.push({ piece, point: hit.point.clone(), distance: hit.distance });
  });
  hits.sort((a, b) => a.distance - b.distance);
  const best = hits[0];
  return best ? { point: best.point, supportPiece: best.piece } : null;
}

function buildAimPointForIsland(island, type) {
  raycaster.setFromCamera(mouse, camera);
  const buildingAim = buildAimBuildingSurface(island, type);
  if (buildingAim) return buildingAim;
  const hits = raycaster
    .intersectObject(island.group, true)
    .filter((hit) => hit.distance <= BUILD_PLACE_MAX_DISTANCE && islandSurfaceContains(island, hit.point, 0.02));
  for (const hit of hits) {
    const groundY = islandGroundY(island, hit.point);
    if (groundY === null) continue;
    if (Math.abs(hit.point.y - groundY) < 2.6 || hit.face?.normal?.y > 0.18) {
      return { point: new THREE.Vector3(hit.point.x, groundY, hit.point.z) };
    }
  }
  const topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -island.landY);
  const planePoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(topPlane, planePoint)) {
    const groundY = islandGroundY(island, planePoint);
    if (groundY !== null && islandSurfaceContains(island, planePoint, 0.02)) {
      return { point: new THREE.Vector3(planePoint.x, groundY, planePoint.z) };
    }
  }
  return null;
}

function buildPlacementFootprints(type, point, rotation) {
  const base = { x: point.x, z: point.z, rot: rotation || 0 };
  if (type === "wall") return [{ ...base, w: BUILD_GRID_SIZE, d: BUILD_WALL_DEPTH }];
  if (type === "cornerWall") {
    return [
      { ...base, x: point.x + Math.cos(base.rot) * BUILD_GRID_SIZE * 0.25, z: point.z - Math.sin(base.rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_GRID_SIZE, d: BUILD_WALL_DEPTH },
      { ...base, x: point.x - Math.sin(base.rot) * BUILD_GRID_SIZE * 0.25, z: point.z + Math.cos(base.rot) * BUILD_GRID_SIZE * 0.25, w: BUILD_WALL_DEPTH, d: BUILD_GRID_SIZE },
    ];
  }
  if (type === "door") {
    return [
      { ...base, x: point.x + Math.cos(base.rot) * 1.28, z: point.z - Math.sin(base.rot) * 1.28, w: 0.62, d: BUILD_WALL_DEPTH },
      { ...base, x: point.x - Math.cos(base.rot) * 1.28, z: point.z + Math.sin(base.rot) * 1.28, w: 0.62, d: BUILD_WALL_DEPTH },
    ];
  }
  if (type === "table") return [{ ...base, w: 2.35, d: 1.35 }];
  if (type === "flag") return [{ ...base, w: 1.0, d: 1.0 }];
  return [{ ...base, w: BUILD_GRID_SIZE, d: BUILD_GRID_SIZE }];
}

function buildPlacementValid(island, type, point, rotation) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z) || !Number.isFinite(point.y)) return false;
  if (!islandSurfaceContains(island, point, 0.02)) return false;
  const surfaceY = buildPlacementSurfaceYAt(island, point, type, rotation);
  if (surfaceY === null || Math.abs(point.y - surfaceY) > 0.72) return false;
  if (pointBlockedOnIsland(island, point, { ignoreSupportForType: type })) return false;
  return true;
}

function buildPlacementForSelected() {
  const type = state.selectedBuildItem;
  if (!BUILD_ITEMS[type]) return { valid: false, reason: "none" };
  if (buildInventoryCount(type) <= 0) {
    return { type, valid: false, reason: "inventory" };
  }
  const island = islands.find((item) => item.name === state.dockedAt) || currentIsland();
  if (!island || state.mode !== "land") return { type, valid: false, reason: "island" };
  const aimed = buildAimPointForIsland(island, type);
  if (!aimed) return { type, island, valid: false, reason: "aim" };
  const point = aimed.point.clone();
  if (!islandSurfaceContains(island, point, 0.02)) return { type, island, point, valid: false, reason: "surface" };
  let rotation = buildRotationForType(type);
  const snapped = snapBuildPlacement(island, point, type, rotation);
  rotation = snapped.rotation;
  const surfaceY = buildPlacementSurfaceYAt(island, point, type, rotation);
  if (surfaceY === null) return { type, island, point, rotation, valid: false, reason: "surface" };
  point.y = surfaceY;
  if (type === "flag") {
    if (!island.claimable || !island.unnamed) return { type, island, point, rotation, valid: false, reason: "claimFirst" };
    if (islandClaimFor(island)) return { type, island, point, rotation, valid: false, reason: "alreadyClaimed" };
  } else if (!playerOwnsIsland(island)) {
    return { type, island, point, rotation, valid: false, reason: "ownedIslandOnly" };
  }
  const valid = buildPlacementValid(island, type, point, rotation);
  return { type, island, point, rotation, valid, reason: valid ? "" : "placement" };
}

function hideBuildPreview() {
  if (buildPreview) buildPreview.visible = false;
}

function ensureBuildPreview(type) {
  if (buildPreview && buildPreviewType === type) return buildPreview;
  if (buildPreview) {
    scene.remove(buildPreview);
    buildPreview.traverse((child) => {
      if (child.geometry?.dispose) child.geometry.dispose();
      if (child.material?.dispose) child.material.dispose();
    });
  }
  buildPreviewType = type;
  buildPreview = makeBuildingMesh({ type, x: 0, y: 0, z: 0, rotation: 0 });
  buildPreview.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshBasicMaterial({
      color: 0x78ffc0,
      transparent: true,
      opacity: 0.54,
      wireframe: true,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    child.renderOrder = 20;
  });
  buildPreview.visible = false;
  scene.add(buildPreview);
  return buildPreview;
}

function updateBuildPreview(force = false) {
  const type = state.selectedBuildItem;
  if (!BUILD_ITEMS[type] || buildInventoryCount(type) <= 0 || state.mode !== "land") {
    hideBuildPreview();
    return;
  }
  const now = performance.now();
  if (!force && now - lastBuildPreviewAt < 70) return;
  lastBuildPreviewAt = now;
  const placement = buildPlacementForSelected();
  if (!placement.point || !placement.island?.unnamed || !placement.island?.claimable) {
    hideBuildPreview();
    return;
  }
  const preview = ensureBuildPreview(type);
  preview.visible = true;
  preview.position.copy(placement.point).add(new THREE.Vector3(0, 0.04, 0));
  preview.rotation.y = placement.rotation || 0;
  const color = placement.valid ? 0x78ffc0 : 0xff624f;
  preview.traverse((child) => {
    if (child.isMesh && child.material?.color) child.material.color.setHex(color);
  });
}

function placeSelectedBuildItem() {
  const placement = buildPlacementForSelected();
  const type = placement.type;
  if (!BUILD_ITEMS[type]) return;
  if (placement.reason === "inventory") {
    state.selectedBuildItem = null;
    hideBuildPreview();
    renderInventory();
    return toast(t("noBuildItem"));
  }
  if (!placement.valid) {
    if (placement.reason === "claimFirst") return toast(t("claimFirst"));
    if (placement.reason === "alreadyClaimed") return toast(t("alreadyClaimed"));
    if (placement.reason === "ownedIslandOnly") return toast(t("ownedIslandOnly"));
    return toast(t("tooFarBuild"));
  }
  const { island, point, rotation } = placement;
  const claimName = type === "flag"
    ? cleanIslandClaimName(prompt(t("claimNamePrompt"), `${captainName()}'s Isle`))
    : "";
  const piece = {
    id: crypto.randomUUID(),
    island: island.name,
    type,
    x: point.x,
    y: point.y,
    z: point.z,
    rotation,
    owner: captainId,
    clientId: captainId,
    sessionId: playerId,
    ownerName: captainName(),
    claimName,
  };
  if (multiplayer.serverWorld) {
    if (!sendMultiplayer({ type: "placeBuilding", piece })) toast("Building server disconnected.");
    return;
  }
  if (type === "flag") {
    const claim = { island: island.name, name: claimName, owner: captainId, clientId: captainId, sessionId: playerId, ownerName: captainName() };
    applyIslandClaim(claim);
    sendMultiplayer({ type: "claimIsland", ...claim });
    toast(t("islandClaimed", { island: claimName }));
  }
  upsertBuildingPiece(piece);
  sendMultiplayer({ type: "placeBuilding", piece });
  state.inventory[type] = buildInventoryCount(type) - 1;
  if (state.inventory[type] <= 0) state.selectedBuildItem = null;
  renderInventory();
  renderShop();
  updateHud();
  toast(t("buildPlaced", { item: buildItemName(type) }));
}

function removeLookedAtBuilding() {
  if (state.mode !== "land") return;
  const findTarget = (pointer, maxDistance) => {
    raycaster.setFromCamera(pointer, camera);
    return buildingPieces
      .map((piece) => {
        const hit = raycaster.intersectObject(piece.group, true)[0];
        return hit ? { piece, distance: hit.distance } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .find((hit) => hit.distance < maxDistance)?.piece || null;
  };
  const target = findTarget(mouse, BUILD_PLACE_MAX_DISTANCE) || findTarget(new THREE.Vector2(0, 0), 30);
  if (!target) return toast("Aim at one of your buildings to remove it.");
  if (!buildingPieceIsMine(target)) return toast(t("ownedIslandOnly"));
  if (multiplayer.serverWorld) {
    sendMultiplayer({ type: "removeBuilding", id: target.id });
    return;
  }
  removeBuildingPiece(target);
  state.inventory[target.type] = buildInventoryCount(target.type) + 1;
  if (target.type === "flag") {
    islandClaimNames.delete(target.island);
    buildingPieces
      .filter((piece) => piece.island === target.island && buildingPieceIsMine(piece))
      .forEach((piece) => {
        state.inventory[piece.type] = buildInventoryCount(piece.type) + 1;
        removeBuildingPiece(piece);
      });
    refreshIslandLabels();
  }
  renderInventory();
  renderShop();
  updateHud();
  sendMultiplayer({ type: "buildingRemoved", id: target.id });
}

function islandGroundY(island, point) {
  if (island.dockBox) {
    const dx = point.x - island.dockBox.x;
    const dz = point.z - island.dockBox.z;
    const rot = island.dockBox.rot || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    if (Math.abs(localX) <= island.dockBox.w * 0.5 && Math.abs(localZ) <= island.dockBox.d * 0.5) return 1.72;
  }
  const dockDistance = dist2(point, island.dock);
  if (!island.surfaceLobes?.length && dockDistance < 7.2) return 1.72;
  let y = null;
  if (island.surfaceLobes?.length) {
    island.surfaceLobes.forEach((lobe, index) => {
      const normalized = islandLobeNormalized(island, lobe, point);
      if (normalized > 1) return;
      const lobeEdge = Math.sqrt(normalized);
      const edgeSlope = clamp((lobeEdge - 0.76) / 0.22, 0, 1);
      const lobeY = island.landY + index * 0.035 - edgeSlope * 0.48;
      y = y === null ? lobeY : Math.max(y, lobeY);
    });
    if (y === null) return null;
  } else {
    const distance = dist2(point, island.group.position);
    if (distance > island.radius - 0.6) return null;
    const edgeSlope = clamp((distance - island.radius * 0.62) / (island.radius * 0.34), 0, 1);
    y = island.landY - edgeSlope * 0.82;
  }
  (island.walkPlatforms || []).forEach((platform) => {
    const dx = point.x - platform.x;
    const dz = point.z - platform.z;
    const rot = platform.rot || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    if (Math.abs(localX) <= platform.w * 0.5 && Math.abs(localZ) <= platform.d * 0.5) {
      const currentY = Number.isFinite(point.y) ? point.y : y;
      if (platform.y - currentY > (platform.maxRise ?? 1.35)) return;
      y = Math.max(y, platform.y);
    }
  });
  (island.terrainFeatures || []).forEach((feature) => {
    const d = dist2(point, feature);
    if (d > feature.r * 1.08 && !(feature.peaks || []).some((peak) => dist2(point, peak) < peak.r * 1.08)) return;
    if (d < feature.r * 1.08) {
      const climb = Math.pow(1 - d / (feature.r * 1.08), 1.45);
      y = Math.max(y, island.landY + climb * feature.h * 0.38);
    }
    (feature.peaks || []).forEach((peak) => {
      const peakDistance = dist2(point, peak);
      if (peakDistance > peak.r * 1.04) return;
      const coneSlope = clamp(1 - peakDistance / (peak.r * 1.04), 0, 1);
      y = Math.max(y, island.landY + coneSlope * peak.h * 0.94);
    });
  });
  y = buildingSurfaceYAt(island, point, y);
  return y;
}

function pointBlockedOnIsland(island, point, options = {}) {
  if (island.obstacles.some((obstacle) => dist2(point, obstacle) < obstacle.r + 0.72)) return true;
  if (pointBlockedByBuildings(island, point, options)) return true;
  return island.collisionBoxes?.some((box) => {
    const pointY = Number.isFinite(point.y) ? point.y : 0;
    if (box.minY !== undefined && pointY < box.minY) return false;
    if (!box.solidWall && box.maxY !== undefined && pointY > box.maxY) return false;
    if (box.walkableTopY !== undefined && point.y >= box.walkableTopY) return false;
    const pad = box.pad ?? 0.45;
    const dx = point.x - box.x;
    const dz = point.z - box.z;
    const rot = box.rot || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) < box.w * 0.5 + pad && Math.abs(localZ) < box.d * 0.5 + pad;
  });
}

function walkableGroundY(island, point) {
  const y = islandGroundY(island, point);
  if (y === null || pointBlockedOnIsland(island, point)) return null;
  return y;
}

function pointInAnyIsland(point, margin = 0) {
  return islands.some((island) => !island.forge && islandFootprintContains(island, point, margin));
}

function botIslandClearance(type) {
  return Math.max(17, shipCollisionRadius(type) * 1.35 + 11);
}

function botIslandBlocker(point, type, extra = 0) {
  let best = null;
  let bestDistance = Infinity;
  const margin = botIslandClearance(type) + extra;
  islands.forEach((island) => {
    if (island.forge) return;
    if (!islandFootprintContains(island, point, margin)) return;
    const distance = dist2(point, island.group.position) - island.radius - margin;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = island;
    }
  });
  return best ? { island: best, distance: bestDistance } : null;
}

function botRouteIslandBlocker(position, target, type, extra = 0) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1) return null;
  let best = null;
  let bestIntrusion = 0;
  const margin = botIslandClearance(type) + extra;
  islands.forEach((island) => {
    if (island.forge) return;
    const toIslandX = island.group.position.x - position.x;
    const toIslandZ = island.group.position.z - position.z;
    const along = clamp((toIslandX * dx + toIslandZ * dz) / lengthSq, 0, 1);
    const closest = new THREE.Vector3(position.x + dx * along, SHIP_WATERLINE_Y, position.z + dz * along);
    const radialIntrusion = island.radius + margin - dist2(closest, island.group.position);
    const intrusion = islandFootprintContains(island, closest, margin) ? Math.max(1, radialIntrusion) : radialIntrusion;
    if (intrusion > bestIntrusion) {
      bestIntrusion = intrusion;
      best = island;
    }
  });
  return best ? { island: best, intrusion: bestIntrusion } : null;
}

function pushBotOutsideIsland(bot, island, extra = 0) {
  const away = bot.group.position.clone().sub(island.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(Math.sin(bot.rotation || 0), 0, Math.cos(bot.rotation || 0));
  away.normalize();
  const safeDistance = island.radius + botIslandClearance(bot.shipType) + extra + 0.8;
  bot.group.position.set(
    island.group.position.x + away.x * safeDistance,
    bot.group.position.y,
    island.group.position.z + away.z * safeDistance,
  );
  const inwardSpeed = bot.velocity.dot(away);
  if (inwardSpeed < 0) bot.velocity.add(away.clone().multiplyScalar(-inwardSpeed + 0.35));
  bot.velocity.multiplyScalar(0.42);
  return away;
}

function localBotIslandDetour(bot, island) {
  const away = bot.group.position.clone().sub(island.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.0001) away.set(Math.sin(bot.rotation || 0), 0, Math.cos(bot.rotation || 0));
  away.normalize();
  const tangentSign = Math.random() < 0.5 ? -1 : 1;
  const tangent = new THREE.Vector3(-away.z * tangentSign, 0, away.x * tangentSign);
  const margin = island.radius + botIslandClearance(bot.shipType) + 13;
  const sweep = 48 + shipCollisionRadius(bot.shipType) * 3.2;
  return new THREE.Vector3(
    clamp(island.group.position.x + away.x * margin + tangent.x * sweep, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94),
    SHIP_WATERLINE_Y,
    clamp(island.group.position.z + away.z * margin + tangent.z * sweep, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94),
  );
}

function islandSwimBlockAt(point, margin = 0) {
  return islands.find((island) => !island.forge && islandFootprintContains(island, point, Math.max(0, margin - 0.8))) || null;
}

function pushSwimmerAwayFromIsland(island, dt) {
  if (!island || !character) return;
  const away = character.position.clone().sub(island.group.position);
  away.y = 0;
  if (away.lengthSq() < 0.0001) {
    away.set(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
  }
  const distance = Math.max(0.001, away.length());
  const targetDistance = island.radius + 0.75;
  if (distance >= targetDistance) return;
  const push = Math.min(targetDistance - distance, 0.65 + dt * 18);
  character.position.add(away.normalize().multiplyScalar(push));
}

function starterIslandCenter() {
  return islands[0]?.group?.position || new THREE.Vector3(islandData[0].x, 0, islandData[0].z);
}

function nearStarterIsland(point, margin = CENTER_BOT_CLEAR_RADIUS) {
  const center = starterIslandCenter();
  return dist2(point, center) < margin;
}

function randomWaterPoint(range = MAP_LIMIT * 0.9, minFromStart = 0) {
  const point = new THREE.Vector3();
  for (let i = 0; i < 80; i++) {
    point.set((Math.random() - 0.5) * range * 2, SHIP_WATERLINE_Y, (Math.random() - 0.5) * range * 2);
    if (dist2(point, state.position) >= minFromStart && !pointInAnyIsland(point, 12)) return point.clone();
  }
  return new THREE.Vector3(range * 0.65, SHIP_WATERLINE_Y, range * 0.65);
}

function randomNorthernWaterPoint(range = MAP_LIMIT * 0.9, minFromStart = 0) {
  const point = new THREE.Vector3();
  const minZ = Math.max(-range, WHALE_NORTH_MIN_Z);
  const maxZ = Math.min(range, WHALE_NORTH_MAX_Z);
  for (let i = 0; i < 100; i++) {
    point.set((Math.random() - 0.5) * range * 2, SHIP_WATERLINE_Y, minZ + Math.random() * Math.max(8, maxZ - minZ));
    if (dist2(point, state.position) >= minFromStart && !pointInAnyIsland(point, 16)) return point.clone();
  }
  return new THREE.Vector3(range * 0.15, SHIP_WATERLINE_Y, WHALE_NORTH_CENTER_Z);
}

function pointInWhaleNorthZone(point, pad = 0) {
  return point.z >= WHALE_NORTH_MIN_Z - pad && point.z <= WHALE_NORTH_MAX_Z + pad;
}

function whaleZoneReturnDirection(position) {
  const target = new THREE.Vector3(position.x * 0.45, 0, clamp(position.z, WHALE_NORTH_MIN_Z + 34, WHALE_NORTH_MAX_Z - 34));
  target.z = WHALE_NORTH_CENTER_Z;
  const toZone = target.sub(position);
  toZone.y = 0;
  if (toZone.lengthSq() < 0.01) toZone.set(0, 0, WHALE_NORTH_CENTER_Z > position.z ? 1 : -1);
  return Math.atan2(toZone.x, toZone.z);
}

function randomTravelWaterPoint(range = MAP_LIMIT * 0.92) {
  const point = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = range * (0.42 + Math.random() * 0.55);
    point.set(Math.sin(angle) * radius, SHIP_WATERLINE_Y, Math.cos(angle) * radius);
    if (!pointInAnyIsland(point, 22) && !nearStarterIsland(point, CENTER_BOT_CLEAR_RADIUS)) return point.clone();
  }
  return randomWaterPoint(range, 92);
}

function initWindCurrents() {
  windCurrents.length = 0;
  for (let i = 0; i < WIND_MARKER_COUNT; i++) {
    const angle = (i / WIND_MARKER_COUNT) * Math.PI * 2 + Math.sin(i * 7.1) * 0.55;
    const radius = MAP_LIMIT * (0.18 + (i % 6) * 0.12);
    const x = Math.cos(angle) * radius + Math.sin(i * 1.9) * 28;
    const z = Math.sin(angle) * radius + Math.cos(i * 2.3) * 28;
    const dir = angle + Math.PI * 0.42 + Math.sin(i * 3.4) * 0.85;
    windCurrents.push({
      x: clamp(x, -MAP_LIMIT * 0.9, MAP_LIMIT * 0.9),
      z: clamp(z, -MAP_LIMIT * 0.9, MAP_LIMIT * 0.9),
      radius: 86 + (i % 4) * 24,
      strength: 1.4 + (i % 5) * 0.45,
      dir,
      vector: new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir)),
    });
  }
}

function windAt(position) {
  const result = new THREE.Vector3();
  windCurrents.forEach((wind) => {
    const dx = position.x - wind.x;
    const dz = position.z - wind.z;
    const distance = Math.hypot(dx, dz);
    if (distance > wind.radius) return;
    const falloff = Math.pow(1 - distance / wind.radius, 1.35);
    result.add(wind.vector.clone().multiplyScalar(wind.strength * falloff));
  });
  return result;
}

function landingPointForShip(island, shipPosition) {
  const center = island.group.position;
  const baseAngle = Math.atan2(shipPosition.x - center.x, shipPosition.z - center.z);
  const offsets = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, Math.PI];
  const distances = island.surfaceLobes?.length
    ? [0.62, 0.54, 0.46, 0.72, 0.36, 0.28].map((fraction) => island.radius * fraction)
    : [island.radius - 4.1];
  for (const offset of offsets) {
    const angle = baseAngle + offset;
    for (const distance of distances) {
      const point = new THREE.Vector3(
        center.x + Math.sin(angle) * distance,
        0,
        center.z + Math.cos(angle) * distance,
      );
      const y = walkableGroundY(island, point);
      if (y !== null) return { point, y };
    }
  }
  const fallback = island.surfaceLobes?.length
    ? center.clone()
    : island.dock.clone().add(new THREE.Vector3(0, 0, -4));
  return { point: fallback, y: islandGroundY(island, fallback) || island.landY };
}

function collidesWithShipAt(point, ownType = state.shipType) {
  const ownRadius = shipCollisionRadius(ownType);
  for (const bot of bots) {
    if (dist2(point, bot.group.position) < (ownRadius + shipCollisionRadius(bot.shipType)) * 0.86) return true;
  }
  for (const remote of remotePlayers.values()) {
    if (remote.group && dist2(point, remote.group.position) < (ownRadius + shipCollisionRadius(remote.shipType)) * 0.86) return true;
    if (remote.fleetShips?.some?.((ship) => ship.group && dist2(point, ship.group.position) < (ownRadius + shipCollisionRadius(ship.type)) * 0.86)) return true;
  }
  for (const ship of ownedShips) {
    if (dist2(point, ship.group.position) < (ownRadius + shipCollisionRadius(ship.type)) * 0.86) return true;
  }
  return false;
}

function shipFlatBasis(rotation = 0) {
  const sin = Math.sin(rotation);
  const cos = Math.cos(rotation);
  return { fx: sin, fz: cos, rx: cos, rz: -sin };
}

function shipHullFootprintPoints(type) {
  type = normalizeShipType(type);
  const cached = shipHullFootprintCache.get(type);
  if (cached) return cached;
  const { length } = shipHullDimensions(type);
  const halfLength = length * 0.53 + 0.25;
  const points = [{ x: 0, z: 0 }];
  [-1, -0.78, -0.55, -0.32, 0, 0.32, 0.55, 0.78, 1].forEach((fraction) => {
    const z = halfLength * fraction;
    const halfWidth = shipHullFootprintHalfWidth(type, z, 0);
    if (halfWidth <= 0) return;
    points.push({ x: 0, z });
    points.push({ x: -halfWidth, z });
    points.push({ x: halfWidth, z });
    if (Math.abs(fraction) < 0.9) {
      points.push({ x: -halfWidth * 0.52, z });
      points.push({ x: halfWidth * 0.52, z });
    }
  });
  shipHullFootprintCache.set(type, points);
  return points;
}

function flatLocalToWorld(local, position, basis) {
  return {
    x: position.x + basis.rx * local.x + basis.fx * local.z,
    z: position.z + basis.rz * local.x + basis.fz * local.z,
  };
}

function flatWorldToLocal(point, position, basis) {
  const dx = point.x - position.x;
  const dz = point.z - position.z;
  return {
    x: dx * basis.rx + dz * basis.rz,
    z: dx * basis.fx + dz * basis.fz,
  };
}

function shipHullFootprintsOverlap(posA, typeA, rotationA, posB, typeB, rotationB, pad = 0.2) {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  const broad = shipCollisionRadius(typeA) + shipCollisionRadius(typeB) + pad + 0.7;
  if (dx * dx + dz * dz > broad * broad) return false;
  const basisA = shipFlatBasis(rotationA);
  const basisB = shipFlatBasis(rotationB);
  const pointsA = shipHullFootprintPoints(typeA);
  const pointsB = shipHullFootprintPoints(typeB);
  for (const point of pointsA) {
    if (localPointInShipHullFootprint(flatWorldToLocal(flatLocalToWorld(point, posA, basisA), posB, basisB), typeB, pad)) return true;
  }
  for (const point of pointsB) {
    if (localPointInShipHullFootprint(flatWorldToLocal(flatLocalToWorld(point, posB, basisB), posA, basisA), typeA, pad)) return true;
  }
  return false;
}

function shipCollisionSupport(type, normal, rotation = 0) {
  const nx = Number(normal?.x) || 0;
  const nz = Number(normal?.z) || 0;
  if (nx * nx + nz * nz < 0.0001) return shipCollisionRadius(type) * 0.86;
  const basis = shipFlatBasis(rotation);
  let best = shipHitRadius(type) * 0.25;
  for (const point of shipHullFootprintPoints(type)) {
    const wx = basis.rx * point.x + basis.fx * point.z;
    const wz = basis.rz * point.x + basis.fz * point.z;
    best = Math.max(best, wx * nx + wz * nz);
  }
  return best + 0.24;
}

function shipSeparationDistance(typeA, typeB, normal = null, rotationA = 0, rotationB = 0) {
  if (normal) {
    return shipCollisionSupport(typeA, { x: -normal.x, z: -normal.z }, rotationA) + shipCollisionSupport(typeB, normal, rotationB) + 0.12;
  }
  return (shipCollisionRadius(typeA) + shipCollisionRadius(typeB)) * 0.86;
}

function separateShipPositions(posA, typeA, velA, posB, typeB, velB, aShare = 0.5, bShare = 0.5, rotationA = 0, rotationB = 0) {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  const distance = Math.hypot(dx, dz);
  const normal = distance > 0.001
    ? new THREE.Vector3(dx / distance, 0, dz / distance)
    : new THREE.Vector3(Math.sin(clock.elapsedTime * 8.17), 0, Math.cos(clock.elapsedTime * 8.17)).normalize();
  const minDistance = shipSeparationDistance(typeA, typeB, normal, rotationA, rotationB);
  if (minDistance <= 0) return false;
  const hullOverlap = shipHullFootprintsOverlap(posA, typeA, rotationA, posB, typeB, rotationB, 0.38);
  if (distance >= minDistance && !hullOverlap) return false;
  const overlap = Math.max(minDistance - distance, hullOverlap ? 0.18 : 0);
  const massA = shipWeight(typeA);
  const massB = shipWeight(typeB);
  const aMotion = aShare / massA;
  const bMotion = bShare / massB;
  const totalMotion = Math.max(0.000001, aMotion + bMotion);
  const correction = Math.max(0, overlap - 0.035) * 0.5;
  posA.add(normal.clone().multiplyScalar(correction * (aMotion / totalMotion)));
  posB.add(normal.clone().multiplyScalar(-correction * (bMotion / totalMotion)));

  const invMassA = velA && aShare > 0 ? aShare / massA : 0;
  const invMassB = velB && bShare > 0 ? bShare / massB : 0;
  const totalInvMass = invMassA + invMassB;
  if (totalInvMass > 0) {
    const velocityA = velA ? velA.dot(normal) : 0;
    const velocityB = velB ? velB.dot(normal) : 0;
    const relativeNormalSpeed = velocityA - velocityB;
    const heavierBias = clamp(Math.max(massA, massB) / Math.max(1, Math.min(massA, massB)), 1, 4);
    const biasSpeed = clamp(Math.max(0, overlap - 0.08) * 0.5 * Math.sqrt(heavierBias), 0, 2.7);
    let normalImpulse = 0;
    if (relativeNormalSpeed < biasSpeed) {
      const restitution = relativeNormalSpeed < -5 ? 0.12 : 0.02;
      normalImpulse = clamp((biasSpeed - (1 + restitution) * relativeNormalSpeed) / totalInvMass, 0, 1250);
      if (velA) velA.add(normal.clone().multiplyScalar(normalImpulse * invMassA));
      if (velB) velB.add(normal.clone().multiplyScalar(-normalImpulse * invMassB));
    }
    if (normalImpulse > 0) {
      const relativeVelocity = new THREE.Vector3();
      if (velA) relativeVelocity.add(velA);
      if (velB) relativeVelocity.sub(velB);
      const tangent = relativeVelocity.sub(normal.clone().multiplyScalar(relativeVelocity.dot(normal)));
      const tangentSpeed = tangent.length();
      if (tangentSpeed > 0.001) {
        const frictionImpulse = Math.min(tangentSpeed / totalInvMass, normalImpulse * 0.42);
        tangent.multiplyScalar(-frictionImpulse / tangentSpeed);
        if (velA) velA.add(tangent.clone().multiplyScalar(invMassA));
        if (velB) velB.add(tangent.clone().multiplyScalar(-invMassB));
      }
    }
    if (velA) velA.multiplyScalar(0.985);
    if (velB) velB.multiplyScalar(0.985);
  }
  return true;
}

function ramKey(a, b) {
  return [a.id, b.id].sort().join(":");
}

function entityForward(entity) {
  const rotation = entity.rotation ?? entity.group?.rotation?.y ?? 0;
  return new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
}

function applyRamDamage(a, b) {
  if (!a?.target || !b?.target || !a.velocity || !b.velocity) return;
  const key = ramKey(a, b);
  if ((ramCooldowns.get(key) || 0) > clock.elapsedTime) return;
  const normal = a.position.clone().sub(b.position);
  normal.y = 0;
  if (normal.lengthSq() < 0.001) return;
  normal.normalize();
  const relativeVelocity = a.velocity.clone().sub(b.velocity);
  const closing = -relativeVelocity.dot(normal);
  if (closing < 2.2) return;
  const weightA = shipWeight(a.type);
  const weightB = shipWeight(b.type);
  const baseWeight = shipWeight("skiff");
  const base = 40 * clamp(closing / 14, 0.22, 2.35);
  const aNose = entityForward(a).dot(normal.clone().multiplyScalar(-1));
  const bNose = entityForward(b).dot(normal);
  const weightPressureA = clamp(weightA / Math.max(1, weightB), 0.45, 2.2);
  const weightPressureB = clamp(weightB / Math.max(1, weightA), 0.45, 2.2);
  let damageToA = base * Math.sqrt(weightB / baseWeight) * (0.34 + weightPressureB * 0.2);
  let damageToB = base * Math.sqrt(weightA / baseWeight) * (0.34 + weightPressureA * 0.2);
  if (aNose > 0.58 && Math.abs(bNose) < 0.42) {
    damageToB *= 1.35;
    damageToA *= 0.55;
  } else if (bNose > 0.58 && Math.abs(aNose) < 0.42) {
    damageToA *= 1.35;
    damageToB *= 0.55;
  }
  if (a.type === "whaler") damageToA *= getShipStats("whaler").ramTakenScale || 0.5;
  if (b.type === "whaler") damageToB *= getShipStats("whaler").ramTakenScale || 0.5;
  if (damageToA > 3 && a.canDamage !== false) damageTarget(a.target, damageToA);
  if (damageToB > 3 && b.canDamage !== false) damageTarget(b.target, damageToB);
  ramCooldowns.set(key, clock.elapsedTime + 1.15);
}

function pushShipOutOfIslands(position, shipType, velocity = null, padding = 4) {
  const radius = shipCollisionRadius(shipType) * 0.62 + padding;
  let pushed = false;
  islands.forEach((island) => {
    const dx = position.x - island.group.position.x;
    const dz = position.z - island.group.position.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = island.radius + radius;
    if (distance >= minDistance) return;
    const normal = distance > 0.001
      ? new THREE.Vector3(dx / distance, 0, dz / distance)
      : new THREE.Vector3(1, 0, 0);
    position.x = island.group.position.x + normal.x * minDistance;
    position.z = island.group.position.z + normal.z * minDistance;
    if (velocity) {
      const inward = velocity.dot(normal);
      if (inward < 0) velocity.add(normal.multiplyScalar(-inward * 1.05));
      velocity.multiplyScalar(0.62);
    }
    pushed = true;
  });
  return pushed;
}

function krakenHeadWorldPosition() {
  if (!krakenBoss?.group) return null;
  return krakenBoss.group.localToWorld(new THREE.Vector3(0, 0, -6.55));
}

function pushShipOutOfKraken(position, shipType, velocity = null, padding = 1) {
  if (!krakenBoss?.alive || !krakenBoss.group) return false;
  const center = krakenHeadWorldPosition();
  if (!center) return false;
  const minDistance = 7.5 + shipHitRadius(shipType) * 0.72 + padding;
  const dx = position.x - center.x;
  const dz = position.z - center.z;
  const distance = Math.hypot(dx, dz);
  if (distance >= minDistance) return false;
  const normal = distance > 0.001
    ? new THREE.Vector3(dx / distance, 0, dz / distance)
    : new THREE.Vector3(1, 0, 0);
  position.x = center.x + normal.x * minDistance;
  position.z = center.z + normal.z * minDistance;
  if (velocity) {
    const inward = velocity.dot(normal);
    if (inward < 0) velocity.add(normal.clone().multiplyScalar(-inward * 1.35));
    velocity.multiplyScalar(0.58);
  }
  return true;
}

function resolveShipContacts() {
  if (state.mode === "ship" && playerShip) {
    bots.forEach((bot) => {
      if (separateShipPositions(playerShip.position, state.shipType, state.velocity, bot.group.position, bot.shipType, bot.velocity, 0.42, 0.58, playerShip.rotation.y, bot.group.rotation.y)) {
        bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + 1.2);
        applyRamDamage(
          { id: "player", target: state, position: playerShip.position, velocity: state.velocity, type: state.shipType, rotation: state.rotation },
          { id: bot.localId || bot.serverId, target: bot, position: bot.group.position, velocity: bot.velocity, type: bot.shipType, rotation: bot.rotation ?? bot.group.rotation.y },
        );
      }
    });
    remotePlayers.forEach((remote) => {
      if (remote.group) separateShipPositions(playerShip.position, state.shipType, state.velocity, remote.group.position, remote.shipType, null, 1, 0, playerShip.rotation.y, remote.group.rotation.y);
      remote.fleetShips?.forEach?.((ship) => {
        if (ship.group) separateShipPositions(playerShip.position, state.shipType, state.velocity, ship.group.position, ship.type, null, 1, 0, playerShip.rotation.y, ship.group.rotation.y);
      });
    });
    ownedShips.forEach((ship) => {
      if (separateShipPositions(playerShip.position, state.shipType, state.velocity, ship.group.position, ship.type, null, 1, 0, playerShip.rotation.y, ship.group.rotation.y)) {
        ship.group.position.y = SHIP_WATERLINE_Y;
      }
    });
    remotePlayers.forEach((remote) => {
      if (remote.group) pushShipOutOfKraken(remote.group.position, remote.shipType, remote.velocity, 1);
    });
    pushShipOutOfIslands(playerShip.position, state.shipType, state.velocity, 3);
    pushShipOutOfKraken(playerShip.position, state.shipType, state.velocity, 1.2);
    playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * PLAYER_SHIP_BOB;
    state.position.copy(playerShip.position);
  }
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    pushShipOutOfIslands(bot.group.position, bot.shipType, bot.velocity, 5);
    pushShipOutOfKraken(bot.group.position, bot.shipType, bot.velocity, 1);
    for (let j = i + 1; j < bots.length; j++) {
      if (separateShipPositions(bot.group.position, bot.shipType, bot.velocity, bots[j].group.position, bots[j].shipType, bots[j].velocity, 0.5, 0.5, bot.group.rotation.y, bots[j].group.rotation.y)) {
        applyRamDamage(
          { id: bot.localId || bot.serverId, target: bot, position: bot.group.position, velocity: bot.velocity, type: bot.shipType, rotation: bot.rotation ?? bot.group.rotation.y },
          { id: bots[j].localId || bots[j].serverId, target: bots[j], position: bots[j].group.position, velocity: bots[j].velocity, type: bots[j].shipType, rotation: bots[j].rotation ?? bots[j].group.rotation.y },
        );
      }
    }
    remotePlayers.forEach((remote) => {
      if (remote.group) separateShipPositions(bot.group.position, bot.shipType, bot.velocity, remote.group.position, remote.shipType, null, 1, 0, bot.group.rotation.y, remote.group.rotation.y);
      remote.fleetShips?.forEach?.((ship) => {
        if (ship.group) separateShipPositions(bot.group.position, bot.shipType, bot.velocity, ship.group.position, ship.type, null, 1, 0, bot.group.rotation.y, ship.group.rotation.y);
      });
    });
    ownedShips.forEach((ship) => {
      separateShipPositions(bot.group.position, bot.shipType, bot.velocity, ship.group.position, ship.type, null, 1, 0, bot.group.rotation.y, ship.group.rotation.y);
    });
  }
  remotePlayers.forEach((remote) => {
    if (remote.group) pushShipOutOfKraken(remote.group.position, remote.shipType, remote.velocity, 1);
    remote.fleetShips?.forEach?.((ship) => {
      if (ship.group) pushShipOutOfKraken(ship.group.position, ship.type, null, 1);
    });
  });
  ownedShips.forEach((ship, index) => {
    pushShipOutOfIslands(ship.group.position, ship.type, null, 3);
    pushShipOutOfKraken(ship.group.position, ship.type, null, 1);
    ship.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.15 + index * 0.7) * OWNED_SHIP_BOB;
  });
}

const DEFAULT_HULL_TUNING = { stern: 0.46, bow: 0.05, mid: 0.96, fullness: 0.72, bowLift: 0.18, sternLift: 0.09, keel: 0.6 };
const HULL_TUNING = {
  skiff: { stern: 0.42, bow: 0.04, mid: 0.92, fullness: 0.72, bowLift: 0.2, sternLift: 0.1, keel: 0.55 },
  dart: { stern: 0.22, bow: 0.025, mid: 0.78, fullness: 0.58, bowLift: 0.28, sternLift: 0.06, keel: 0.5 },
  storm: { stern: 0.28, bow: 0.025, mid: 0.82, fullness: 0.6, bowLift: 0.26, sternLift: 0.06, keel: 0.5 },
  clipper: { stern: 0.22, bow: 0.02, mid: 0.84, fullness: 0.55, bowLift: 0.24, sternLift: 0.05, keel: 0.55 },
  schooner: { stern: 0.28, bow: 0.03, mid: 0.86, fullness: 0.6, bowLift: 0.22, sternLift: 0.06, keel: 0.52 },
  dhow: { stern: 0.2, bow: 0.02, mid: 0.78, fullness: 0.56, bowLift: 0.34, sternLift: 0.04, keel: 0.52 },
  xebec: { stern: 0.2, bow: 0.02, mid: 0.82, fullness: 0.55, bowLift: 0.32, sternLift: 0.06, keel: 0.52 },
  lugger: { stern: 0.3, bow: 0.04, mid: 0.84, fullness: 0.62, bowLift: 0.2, sternLift: 0.08, keel: 0.52 },
  brig: { stern: 0.55, bow: 0.05, mid: 0.98, fullness: 0.72, bowLift: 0.16, sternLift: 0.1, keel: 0.62 },
  cog: { stern: 0.72, bow: 0.08, mid: 1.02, fullness: 0.88, bowLift: 0.14, sternLift: 0.16, keel: 0.58 },
  junk: { stern: 0.66, bow: 0.1, mid: 1.0, fullness: 0.85, bowLift: 0.12, sternLift: 0.12, keel: 0.52 },
  fluyt: { stern: 0.78, bow: 0.08, mid: 1.08, fullness: 0.95, bowLift: 0.12, sternLift: 0.1, keel: 0.66 },
  galleon: { stern: 0.72, bow: 0.06, mid: 1.08, fullness: 0.9, bowLift: 0.18, sternLift: 0.15, keel: 0.76 },
  carrack: { stern: 0.78, bow: 0.08, mid: 1.1, fullness: 0.95, bowLift: 0.16, sternLift: 0.2, keel: 0.72 },
  manowar: { stern: 0.72, bow: 0.06, mid: 1.12, fullness: 0.92, bowLift: 0.15, sternLift: 0.12, keel: 0.82 },
  frigate: { stern: 0.52, bow: 0.04, mid: 1.0, fullness: 0.72, bowLift: 0.18, sternLift: 0.08, keel: 0.7 },
  turtle: { stern: 0.82, bow: 0.12, mid: 1.12, fullness: 1.05, bowLift: 0.08, sternLift: 0.08, keel: 0.6 },
  treasure: { stern: 0.72, bow: 0.06, mid: 1.04, fullness: 0.82, bowLift: 0.18, sternLift: 0.2, keel: 0.76 },
  longship: { stern: 0.05, bow: 0.04, mid: 0.68, fullness: 0.55, bowLift: 0.3, sternLift: 0.24, keel: 0.45 },
  galley: { stern: 0.08, bow: 0.03, mid: 0.72, fullness: 0.52, bowLift: 0.26, sternLift: 0.16, keel: 0.44 },
  cat: { stern: 0.18, bow: 0.04, mid: 0.65, fullness: 0.55, bowLift: 0.18, sternLift: 0.08, keel: 0.34 },
  ironclad: { stern: 0.76, bow: 0.14, mid: 1.08, fullness: 1.05, bowLift: 0.05, sternLift: 0.05, keel: 0.48 },
};

function hullProfile(profile = "skiff") {
  return { ...DEFAULT_HULL_TUNING, ...(HULL_TUNING[profile] || {}) };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hullMesh(length, width, height, material = mats.hull, profile = "skiff") {
  length = finiteNumber(length, DEFAULT_SHIP_HULL_DIMENSIONS[0]);
  width = finiteNumber(width, DEFAULT_SHIP_HULL_DIMENSIONS[1]);
  height = finiteNumber(height, 1);
  const rawTuning = hullProfile(profile);
  const tuning = {
    stern: finiteNumber(rawTuning.stern, DEFAULT_HULL_TUNING.stern),
    bow: finiteNumber(rawTuning.bow, DEFAULT_HULL_TUNING.bow),
    mid: finiteNumber(rawTuning.mid, DEFAULT_HULL_TUNING.mid),
    fullness: finiteNumber(rawTuning.fullness, DEFAULT_HULL_TUNING.fullness),
    bowLift: finiteNumber(rawTuning.bowLift, DEFAULT_HULL_TUNING.bowLift),
    sternLift: finiteNumber(rawTuning.sternLift, DEFAULT_HULL_TUNING.sternLift),
    keel: finiteNumber(rawTuning.keel, DEFAULT_HULL_TUNING.keel),
  };
  const vertices = [];
  const indices = [];
  const stationCount = 10;
  const sectionCount = 7;
  const addVertex = (x, y, z) => {
    vertices.push(x, y, z);
    return vertices.length / 3 - 1;
  };
  for (let i = 0; i < stationCount; i++) {
    const t = i / (stationCount - 1);
    const z = length * (0.52 - t * 1.1);
    const midCurve = Math.pow(Math.max(0, Math.sin(t * Math.PI)), tuning.fullness);
    const endWidth = tuning.stern * (1 - t) + tuning.bow * t;
    const beam = width * (endWidth * (1 - midCurve) + tuning.mid * midCurve);
    const topHalf = beam * 0.48;
    const chineHalf = beam * (0.38 + 0.08 * midCurve);
    const bilgeHalf = beam * (0.18 + 0.04 * midCurve);
    const bowLift = Math.pow(t, 2.2) * tuning.bowLift * height;
    const sternLift = Math.pow(1 - t, 2.4) * tuning.sternLift * height;
    const deckY = height * (0.92 + 0.08 * Math.sin(t * Math.PI)) + bowLift + sternLift;
    const chineY = height * (0.35 + 0.06 * midCurve);
    const bilgeY = height * (0.08 + 0.04 * midCurve);
    const keelY = -height * (0.08 + tuning.keel * (0.18 + 0.82 * midCurve));
    [
      [-topHalf, deckY, z],
      [-chineHalf, chineY, z],
      [-bilgeHalf, bilgeY, z],
      [0, keelY, z],
      [bilgeHalf, bilgeY, z],
      [chineHalf, chineY, z],
      [topHalf, deckY, z],
    ].forEach((point) => addVertex(...point));
  }
  for (let i = 0; i < stationCount - 1; i++) {
    for (let j = 0; j < sectionCount - 1; j++) {
      const a = i * sectionCount + j;
      const b = i * sectionCount + j + 1;
      const c = (i + 1) * sectionCount + j;
      const d = (i + 1) * sectionCount + j + 1;
      indices.push(a, c, b, b, c, d);
    }
    const leftTop = i * sectionCount;
    const rightTop = i * sectionCount + sectionCount - 1;
    const nextLeftTop = (i + 1) * sectionCount;
    const nextRightTop = (i + 1) * sectionCount + sectionCount - 1;
    indices.push(leftTop, rightTop, nextLeftTop, rightTop, nextRightTop, nextLeftTop);
  }
  const sternCenter = addVertex(0, height * 0.34, length * 0.52);
  const bowCenter = addVertex(0, height * (0.42 + tuning.bowLift), -length * 0.58);
  for (let j = 0; j < sectionCount - 1; j++) {
    indices.push(sternCenter, j + 1, j);
    const bowStart = (stationCount - 1) * sectionCount;
    indices.push(bowCenter, bowStart + j, bowStart + j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const renderMaterial = material.clone();
  renderMaterial.side = THREE.DoubleSide;
  renderMaterial.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, renderMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addHullEndCaps(group, length, width, scale, material = mats.hull, profile = "skiff") {
  const sternZ = length * 0.515 * scale;
  const bowZ = -length * 0.565 * scale;
  const sternWidth = Math.max(width * scale * 0.42, hullSideXAt(length, width, scale, sternZ, 1.12, profile) * 2.05);
  const bowWidth = Math.max(width * scale * 0.22, hullSideXAt(length, width, scale, bowZ, 1.3, profile) * 1.9);
  const stern = new THREE.Mesh(new THREE.BoxGeometry(sternWidth, 0.76 * scale, 0.18 * scale), material);
  stern.position.set(0, 0.72 * scale, sternZ);
  stern.castShadow = true;
  stern.receiveShadow = true;
  group.add(stern);
  const sternCap = new THREE.Mesh(new THREE.BoxGeometry(sternWidth * 0.92, 0.12 * scale, 0.26 * scale), mats.hullDark);
  sternCap.position.set(0, 1.12 * scale, sternZ + 0.03 * scale);
  sternCap.castShadow = true;
  group.add(sternCap);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(bowWidth, 0.52 * scale, 0.14 * scale), material);
  bow.position.set(0, 0.66 * scale, bowZ);
  bow.castShadow = true;
  bow.receiveShadow = true;
  group.add(bow);
}

function addMastBase(group, z, scale) {
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.24 * scale, 0.12 * scale, 10), mats.hullDark);
  collar.position.set(0, 1.34 * scale, z);
  collar.castShadow = true;
  group.add(collar);
}

function addSail(group, x, z, scale, color = 0xfff4da) {
  const mastX = 0;
  const mastZ = z * MAST_SPACING_SCALE;
  const mastBottom = 1.42 * scale;
  const mastHeight = 4.6 * scale * MAST_SIZE_SCALE;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale * 1.12, 0.14 * scale * 1.12, mastHeight, 7), mats.dark);
  mast.position.set(mastX, mastBottom + mastHeight * 0.5, mastZ);
  mast.castShadow = true;
  group.add(mast);
  addMastBase(group, mastZ, scale);
  const sail = foreAftLateenPanel(2.9 * scale, 3.65 * scale, color, 0.12 * scale);
  sail.position.set(0.04 * scale, mastBottom + mastHeight * 0.44, mastZ + 0.08 * scale);
  group.add(sail);
  addRope(
    group,
    new THREE.Vector3(mastX, mastBottom + mastHeight * 0.83, mastZ + 1.25 * scale),
    new THREE.Vector3(mastX, 2.3 * scale, mastZ - 1.25 * scale),
    scale,
    0.045,
  );
  addRope(
    group,
    new THREE.Vector3(mastX, 2.28 * scale, mastZ + 1.1 * scale),
    new THREE.Vector3(mastX, 2.12 * scale, mastZ - 1.2 * scale),
    scale,
    0.036,
  );
  const mastTop = mastBottom + mastHeight;
  addRope(group, new THREE.Vector3(mastX, mastTop, mastZ), new THREE.Vector3(-1.05 * scale, 1.55 * scale, mastZ + 1.25 * scale), scale, 0.015);
  addRope(group, new THREE.Vector3(mastX, mastTop, mastZ), new THREE.Vector3(1.05 * scale, 1.55 * scale, mastZ + 1.25 * scale), scale, 0.015);
  addRope(group, new THREE.Vector3(mastX, mastTop, mastZ), new THREE.Vector3(0, 1.5 * scale, mastZ - 1.7 * scale), scale, 0.014);
}

function addSquareSail(group, x, z, scale, color = 0xfff4da, tiers = 1) {
  const mastX = 0;
  const mastZ = z * MAST_SPACING_SCALE;
  const mastBottom = 1.42 * scale;
  const mastHeight = (4.6 + tiers * 0.55) * scale * MAST_SIZE_SCALE;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale * 1.12, 0.16 * scale * 1.12, mastHeight, 7), mats.dark);
  mast.position.set(mastX, mastBottom + mastHeight * 0.5, mastZ);
  mast.castShadow = true;
  group.add(mast);
  addMastBase(group, mastZ, scale);
  for (let i = 0; i < tiers; i++) {
    const y = mastBottom + (1.78 + i * 1.2) * scale * MAST_SIZE_SCALE;
    const sailWidth = (2.5 - i * 0.28) * scale;
    const sailHeight = (1.16 - i * 0.06) * scale;
    const sail = clothPanel(sailWidth, sailHeight, color, 0.16 * scale);
    sail.position.set(mastX, y, mastZ - 0.05 * scale);
    group.add(sail);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, (2.55 - i * 0.2) * scale, 6), mats.dark);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(mastX, y + 0.5 * scale, mastZ - 0.08 * scale);
    group.add(yard);
    for (let seam = -1; seam <= 1; seam += 2) {
      addRope(
        group,
        new THREE.Vector3(mastX - sailWidth * 0.45, y + seam * sailHeight * 0.18, mastZ - 0.11 * scale),
        new THREE.Vector3(mastX + sailWidth * 0.45, y + seam * sailHeight * 0.18, mastZ - 0.11 * scale),
        scale,
        0.014,
      );
    }
    for (let seam = -1; seam <= 1; seam += 2) {
      addRope(
        group,
        new THREE.Vector3(mastX + seam * sailWidth * 0.18, y - sailHeight * 0.43, mastZ - 0.12 * scale),
        new THREE.Vector3(mastX + seam * sailWidth * 0.18, y + sailHeight * 0.43, mastZ - 0.12 * scale),
        scale,
        0.011,
      );
    }
    const mastTop = mastBottom + mastHeight;
    addRope(group, new THREE.Vector3(mastX, mastTop, mastZ), new THREE.Vector3(mastX - (1.25 - i * 0.1) * scale, y + 0.45 * scale, mastZ), scale * 0.82, 0.014);
    addRope(group, new THREE.Vector3(mastX, mastTop, mastZ), new THREE.Vector3(mastX + (1.25 - i * 0.1) * scale, y + 0.45 * scale, mastZ), scale * 0.82, 0.014);
  }
}

function addRope(group, start, end, scale = 1, radius = 0.022, material = mats.rope) {
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(radius * scale, radius * scale, 1, 6), material);
  setCylinderBetween(rope, start, end);
  group.add(rope);
  return rope;
}

function sailMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
}

function clothPanel(width, height, color, belly = 0.16) {
  const vertices = [];
  const indices = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const u = x / 2;
      const v = y / 2;
      const curve = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * belly;
      vertices.push((u - 0.5) * width, (v - 0.5) * height, curve);
    }
  }
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const a = y * 3 + x;
      indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function lateenPanel(width, height, color, belly = 0.14) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    width * 0.38, height * 0.52, 0,
    -width * 0.55, -height * 0.44, 0,
    width * 0.5, -height * 0.34, 0,
    width * 0.06, -height * 0.06, belly,
  ], 3));
  geo.setIndex([0, 1, 3, 0, 3, 2, 1, 2, 3]);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function foreAftLateenPanel(length, height, color, belly = 0.12) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    belly, height * 0.52, length * 0.48,
    -belly * 0.45, -height * 0.42, -length * 0.55,
    -belly * 0.25, -height * 0.34, length * 0.34,
    belly, -height * 0.05, -length * 0.04,
  ], 3));
  geo.setIndex([0, 1, 3, 0, 3, 2, 1, 2, 3]);
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, sailMaterial(color));
  sail.castShadow = true;
  return sail;
}

function addCabin(group, x, z, width, depth, scale, color = 0x6b432b) {
  const px = x;
  const pz = z;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * scale, 1.0 * scale, depth * scale), mat(color));
  cabin.position.set(px, 1.82 * scale, pz);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry((width + 0.35) * scale, 0.22 * scale, (depth + 0.28) * scale), mat(0x2f3342));
  roof.position.set(px, 2.43 * scale, pz);
  roof.castShadow = true;
  group.add(roof);
  for (let side of [-1, 1]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.34 * scale, 0.38 * scale), mats.gold);
    window.position.set(px + side * (width * 0.52) * scale, 1.86 * scale, pz);
    group.add(window);
  }
}

function addWhalerCabinInterior(group, scale) {
  const pz = 2.0 * scale;
  const cabinW = 2.25 * scale;
  const cabinD = 1.2 * scale;
  const floorY = 1.43 * scale;
  const wallH = 0.92 * scale;
  const wallY = floorY + wallH * 0.5;
  const wallT = 0.055 * scale;
  const doorW = 0.92 * scale;
  const doorH = 0.7 * scale;
  const frontZ = pz - cabinD * 0.5;
  const backZ = pz + cabinD * 0.5;
  const wallMat = mat(0x526069).clone();
  wallMat.side = THREE.DoubleSide;
  wallMat.needsUpdate = true;
  const roofMat = mat(0x2f3342).clone();
  roofMat.side = THREE.DoubleSide;
  roofMat.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.9, 0.045 * scale, cabinD * 0.82), mats.plank);
  floor.position.set(0, floorY, pz);
  floor.receiveShadow = true;
  group.add(floor);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(cabinW, wallH, wallT), wallMat);
  backWall.position.set(0, wallY, backZ);
  backWall.castShadow = true;
  group.add(backWall);
  [-1, 1].forEach((side) => {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, cabinD), wallMat);
    sideWall.position.set(side * cabinW * 0.5, wallY, pz);
    sideWall.castShadow = true;
    group.add(sideWall);
    const frontPieceW = (cabinW - doorW) * 0.5;
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(frontPieceW, wallH, wallT), wallMat);
    frontWall.position.set(side * (doorW * 0.5 + frontPieceW * 0.5), wallY, frontZ);
    frontWall.castShadow = true;
    group.add(frontWall);
    const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(wallT * 1.15, 0.28 * scale, 0.34 * scale), mats.gold);
    sideWindow.position.set(side * (cabinW * 0.5 + wallT * 0.2), wallY + 0.08 * scale, pz + 0.06 * scale);
    group.add(sideWindow);
  });
  const header = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.12 * scale, Math.max(0.12 * scale, wallH - doorH), wallT * 1.2), wallMat);
  header.position.set(0, floorY + doorH + (wallH - doorH) * 0.5, frontZ);
  group.add(header);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinW + 0.28 * scale, 0.2 * scale, cabinD + 0.26 * scale), roofMat);
  roof.position.set(0, 2.18 * scale, pz);
  roof.castShadow = true;
  group.add(roof);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.85, 0.045 * scale, 0.18 * scale), mats.plank);
  threshold.position.set(0, floorY + 0.035 * scale, frontZ - 0.09 * scale);
  threshold.castShadow = true;
  group.add(threshold);
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.56 * scale, 0.14 * scale, 0.34 * scale), mat(0x6b482f));
  table.position.set(0, floorY + 0.2 * scale, pz);
  table.castShadow = true;
  group.add(table);
  const chart = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.025 * scale, 0.22 * scale), mat(0xd8c28f));
  chart.position.set(0.04 * scale, floorY + 0.285 * scale, pz);
  chart.rotation.y = -0.18;
  group.add(chart);
  const bunk = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.14 * scale, 0.68 * scale), mat(0x493425));
  bunk.position.set(0.68 * scale, floorY + 0.15 * scale, pz - 0.05 * scale);
  bunk.castShadow = true;
  group.add(bunk);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.29 * scale, 0.045 * scale, 0.5 * scale), mat(0x405f88));
  blanket.position.set(0.68 * scale, floorY + 0.245 * scale, pz - 0.05 * scale);
  group.add(blanket);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.28 * scale, 0.3 * scale), mat(0x3e2b21));
  chest.position.set(-0.7 * scale, floorY + 0.17 * scale, pz + 0.25 * scale);
  chest.castShadow = true;
  group.add(chest);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 6), mats.gold);
  lamp.position.set(0, 2.0 * scale, pz - 0.12 * scale);
  group.add(lamp);
}

function addSternGallery(group, length, width, scale, color) {
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(width * 0.64 * scale, 0.72 * scale, 0.28 * scale), mat(color));
  gallery.position.set(0, 1.55 * scale, length * 0.41 * scale);
  gallery.castShadow = true;
  group.add(gallery);
  for (let i = -1; i <= 1; i++) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.26 * scale, 0.05 * scale), mats.gold);
    window.position.set(i * width * 0.18 * scale, 1.58 * scale, length * 0.49 * scale);
    group.add(window);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, width * 0.72 * scale, 7), mats.wood);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.92 * scale, length * 0.5 * scale);
  group.add(rail);
}

function addCannonPorts(group, count, width, length, scale, profile = "skiff") {
  const gunScale = profile === "treasure" ? 1.35 : 1;
  const gunY = (profile === "treasure" ? 1.34 : 1.25) * scale;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const z = (-length * 0.29 + t * length * 0.58) * scale;
    for (let side of [-1, 1]) {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale * gunScale, 0.28 * scale * gunScale, 0.32 * scale * gunScale), mats.dark);
      const sideX = side * hullSideXAt(length, width, scale, z, 0.98, profile);
      port.position.set(sideX, gunY, z);
      group.add(port);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale * gunScale, 0.08 * scale * gunScale, 0.5 * scale * gunScale, 8), mats.dark);
      muzzle.rotation.z = Math.PI / 2;
      muzzle.position.set(sideX + side * 0.2 * scale * gunScale, gunY, z);
      group.add(muzzle);
      if (profile === "treasure") {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.145 * scale * gunScale, 0.035 * scale, 0.42 * scale * gunScale), mats.gold);
        trim.position.set(sideX + side * 0.01 * scale, gunY + 0.22 * scale, z);
        group.add(trim);
      }
    }
  }
}

function addCenterlineDeckCannon(group, length, scale) {
  const deckZ = -length * 0.23 * scale;
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.2 * scale, 0.62 * scale), mat(0x3a261b));
  carriage.position.set(0, 1.24 * scale, deckZ);
  carriage.castShadow = true;
  group.add(carriage);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * scale, 0.105 * scale, 0.95 * scale, 10), mats.dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.36 * scale, deckZ - 0.24 * scale);
  barrel.castShadow = true;
  group.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.105 * scale, 0.12 * scale, 10), mats.dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 1.36 * scale, deckZ - 0.76 * scale);
  muzzle.castShadow = true;
  group.add(muzzle);

  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.16 * scale, 0.18 * scale, 10), mats.wood);
  pivot.position.set(0, 1.26 * scale, deckZ);
  pivot.castShadow = true;
  group.add(pivot);
}

function addTurtleGunModels(group, length, width, scale, profile = "turtle") {
  const gunCount = shipSideCannons("turtle");
  for (let i = 0; i < gunCount; i++) {
    const z = (-length * 0.31 + (i / Math.max(1, gunCount - 1)) * length * 0.62) * scale;
    for (const side of [-1, 1]) {
      const sideX = side * hullSideXAt(length, width, scale, z, 1.04, profile);
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.18 * scale, 0.38 * scale), mat(0x2d241c));
      carriage.position.set(sideX - side * 0.18 * scale, 1.46 * scale, z);
      carriage.castShadow = true;
      group.add(carriage);
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.34 * scale, 0.46 * scale), mat(0x7f3528));
      shield.position.set(sideX + side * 0.02 * scale, 1.52 * scale, z);
      shield.castShadow = true;
      group.add(shield);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 0.74 * scale, 10), mats.dark);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(sideX + side * 0.36 * scale, 1.52 * scale, z);
      barrel.castShadow = true;
      group.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.1 * scale, 10), mats.dark);
      muzzle.rotation.z = Math.PI / 2;
      muzzle.position.set(sideX + side * 0.76 * scale, 1.52 * scale, z);
      muzzle.castShadow = true;
      group.add(muzzle);
    }
  }
}

function addTurtleShipMasts(group, scale) {
  const mastMat = mat(0x3d281a);
  const battenMat = mat(0x76502f);
  const sailColor = 0xd8c293;
  [
    { z: -1.9, height: 2.75, width: 1.72, sailHeight: 1.08, flag: 0xb25a35 },
    { z: 1.48, height: 2.42, width: 1.48, sailHeight: 0.94, flag: 0xd99928 },
  ].forEach((rig, index) => {
    const mastZ = rig.z * scale;
    const mastBottom = 2.36 * scale;
    const mastHeight = rig.height * scale;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.12 * scale, mastHeight, 10), mastMat);
    mast.position.set(0, mastBottom + mastHeight * 0.5, mastZ);
    mast.castShadow = true;
    group.add(mast);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.3 * scale, 0.16 * scale, 12), mat(0x9b4a2f));
    collar.position.set(0, 2.8 * scale, mastZ);
    collar.castShadow = true;
    group.add(collar);
    const yardY = mastBottom + mastHeight * 0.68;
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.055 * scale, rig.width * scale, 8), mastMat);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, yardY + 0.42 * scale, mastZ - 0.03 * scale);
    yard.castShadow = true;
    group.add(yard);
    const sail = clothPanel(rig.width * 0.84 * scale, rig.sailHeight * scale, sailColor, 0.1 * scale);
    sail.position.set(0, yardY - 0.08 * scale, mastZ - 0.08 * scale);
    group.add(sail);
    for (let slat = -1; slat <= 1; slat++) {
      const batten = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, rig.width * 0.82 * scale, 6), battenMat);
      batten.rotation.z = Math.PI / 2;
      batten.position.set(0, yardY + slat * rig.sailHeight * 0.25 * scale, mastZ - 0.12 * scale);
      group.add(batten);
    }
    const flag = clothPanel(0.42 * scale, 0.28 * scale, rig.flag, 0.04 * scale);
    flag.position.set(0.33 * scale, mastBottom + mastHeight + 0.06 * scale, mastZ);
    flag.rotation.y = index ? -0.2 : 0.2;
    group.add(flag);
    addRope(group, new THREE.Vector3(0, mastBottom + mastHeight, mastZ), new THREE.Vector3(-1.15 * scale, 2.95 * scale, mastZ - 0.58 * scale), scale, 0.012, mats.rope);
    addRope(group, new THREE.Vector3(0, mastBottom + mastHeight, mastZ), new THREE.Vector3(1.15 * scale, 2.95 * scale, mastZ + 0.58 * scale), scale, 0.012, mats.rope);
  });
}

function addOars(group, count, width, length, scale, profile = "skiff") {
  for (let i = 0; i < count; i++) {
    const z = (-length * 0.28 + i * length * 0.56 / Math.max(1, count - 1)) * scale;
    for (let side of [-1, 1]) {
      const rowlockX = side * hullSideXAt(length, width, scale, z, 1.02, profile);
      const rowlock = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.08 * scale, 0.16 * scale), mats.hullDark);
      rowlock.position.set(rowlockX, 1.22 * scale, z);
      group.add(rowlock);
      const grip = new THREE.Vector3(rowlockX, 1.18 * scale, z);
      const bladePoint = new THREE.Vector3(rowlockX + side * 1.65 * scale, 0.82 * scale, z);
      addRope(group, grip, bladePoint, scale, 0.035, mats.wood);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.05 * scale, 0.18 * scale), mats.wood);
      blade.position.copy(bladePoint);
      blade.rotation.z = -0.22 * side;
      group.add(blade);
    }
  }
}

function addHullDetailLines(group, length, width, scale, tier, profile = "skiff") {
  const rows = 2 + Math.min(3, tier);
  for (let side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const y = (0.55 + row * 0.23) * scale;
      addHullSideLine(
        group,
        length,
        width,
        scale,
        side,
        y,
        -length * 0.34 * scale,
        length * 0.34 * scale,
        mats.rope,
        0.014,
        0.72 - row * 0.035,
        profile,
      );
    }
    const ribCount = 4 + tier;
    for (let i = 0; i < ribCount; i++) {
      const t = i / Math.max(1, ribCount - 1);
      const z = (-length * 0.33 + t * length * 0.66) * scale;
      const lowerX = side * hullSideXAt(length, width, scale, z, 0.68, profile);
      const upperX = side * hullSideXAt(length, width, scale, z, 0.94, profile);
      addRope(group, new THREE.Vector3(lowerX, 0.36 * scale, z), new THREE.Vector3(upperX, 1.26 * scale, z), scale, 0.022);
    }
  }
}

function addDeckFittings(group, length, width, scale, tier, color, profile = "skiff") {
  const hatch = hullMesh(1.0 * scale, 0.72 * scale, 0.12 * scale, mats.hullDark, "skiff");
  hatch.position.set(0, 1.28 * scale, -0.35 * scale);
  hatch.scale.z = 0.72;
  group.add(hatch);
  const cargoCount = 1 + Math.min(3, tier);
  for (let i = 0; i < cargoCount; i++) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.2 * scale, 0.44 * scale, 8), mats.wood);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(((i % 2) ? 0.52 : -0.52) * width * 0.22 * scale, 1.38 * scale, (0.18 + i * 0.52) * scale);
    group.add(barrel);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.035 * scale, 8, 18), mats.rope);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(width * 0.17 * scale, 1.42 * scale, -length * 0.16 * scale);
  group.add(coil);
  const anchor = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.045 * scale, 8, 16, Math.PI * 1.3), mats.dark);
  anchor.position.set(-hullSideXAt(length, width, scale, -length * 0.34 * scale, 0.96, profile), 1.12 * scale, -length * 0.34 * scale);
  anchor.rotation.set(Math.PI / 2, 0, 0.45);
  group.add(anchor);
  if (tier >= 2) {
    for (let side of [-1, 1]) {
      const lanternX = side * hullSideXAt(length, width, scale, length * 0.3 * scale, 0.86, profile);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.03 * scale, 0.42 * scale, 6), mats.dark);
      post.position.set(lanternX, 1.52 * scale, length * 0.3 * scale);
      group.add(post);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 6), mats.gold);
      lantern.position.set(lanternX, 1.72 * scale, length * 0.3 * scale);
      group.add(lantern);
    }
  }
  if (tier >= 3) {
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.22 * scale, 0.08 * scale, 16), mat(color));
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 1.72 * scale, length * 0.38 * scale);
    group.add(crest);
  }
}

function addShipNightLights(group, length, width, scale, tier, profile = "skiff") {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffbd55,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb34a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1, 48), haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(0, 0.075 * scale, 0.05 * length * scale);
  halo.scale.set(width * 1.45 * scale, length * 0.84 * scale, 1);
  group.add(halo);
  const positions = [
    { x: -hullSideXAt(length, width, scale, length * 0.24 * scale, 0.88, profile), z: length * 0.24 * scale },
    { x: hullSideXAt(length, width, scale, length * 0.24 * scale, 0.88, profile), z: length * 0.24 * scale },
  ];
  if (tier >= 2) positions.push({ x: 0, z: -length * 0.34 * scale });
  if (tier >= 4) positions.push({ x: 0, z: length * 0.38 * scale });
  positions.forEach((pos) => {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 9, 7), material);
    lantern.position.set(pos.x, 1.72 * scale, pos.z);
    lantern.userData.shipNightGlow = true;
    group.add(lantern);
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.22 * scale, 6), mats.dark);
    cage.position.set(pos.x, 1.72 * scale, pos.z);
    group.add(cage);
  });
  const light = new THREE.PointLight(0xffb33e, 0, (16 + tier * 2.8) * scale, 1.35);
  light.position.set(0, 1.92 * scale, length * 0.1 * scale);
  group.add(light);
  shipNightLights.push({
    group,
    material,
    haloMaterial,
    haloOpacity: 0.14 + Math.min(0.08, tier * 0.012),
    lights: [light],
    baseIntensity: 1.35 + Math.min(0.9, tier * 0.14),
  });
}

function addBowspritAndRudder(group, length, width, scale, tier) {
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.075 * scale, (1.5 + tier * 0.22) * scale, 7), mats.wood);
  bowsprit.rotation.x = Math.PI / 2.25;
  bowsprit.position.set(0, 1.2 * scale, -length * 0.5 * scale);
  group.add(bowsprit);
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.62 * scale, 0.42 * scale), mats.hullDark);
  rudder.position.set(0, 0.64 * scale, length * 0.48 * scale);
  group.add(rudder);
}

function deckWidthAt(length, width, scale, z, profile = "skiff") {
  return hullSideXAt(length, width, scale, z, 0.72, profile) * 2;
}

function hullSideXAt(length, width, scale, z, inset = 1, profile = "skiff") {
  length = finiteNumber(length, DEFAULT_SHIP_HULL_DIMENSIONS[0]);
  width = finiteNumber(width, DEFAULT_SHIP_HULL_DIMENSIONS[1]);
  scale = finiteNumber(scale, 1);
  z = finiteNumber(z, 0);
  inset = finiteNumber(inset, 1);
  const rawTuning = hullProfile(profile);
  const tuning = {
    stern: finiteNumber(rawTuning.stern, DEFAULT_HULL_TUNING.stern),
    bow: finiteNumber(rawTuning.bow, DEFAULT_HULL_TUNING.bow),
    mid: finiteNumber(rawTuning.mid, DEFAULT_HULL_TUNING.mid),
    fullness: finiteNumber(rawTuning.fullness, DEFAULT_HULL_TUNING.fullness),
  };
  const localZ = z / scale;
  const t = clamp((0.52 - localZ / Math.max(0.001, length)) / 1.1, 0, 1);
  const midCurve = Math.pow(Math.max(0.001, Math.sin(t * Math.PI)), tuning.fullness);
  const endWidth = tuning.stern * (1 - t) + tuning.bow * t;
  const beam = width * scale * (endWidth * (1 - midCurve) + tuning.mid * midCurve);
  return beam * 0.45 * inset;
}

function addHullSideLine(group, length, width, scale, side, y, zStart, zEnd, material, radius = 0.026, inset = 0.98, profile = "skiff") {
  const points = [];
  const segments = 7;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = zStart + (zEnd - zStart) * t;
    points.push(new THREE.Vector3(side * hullSideXAt(length, width, scale, z, inset, profile), y, z));
  }
  for (let i = 1; i < points.length; i++) {
    addRope(group, points[i - 1], points[i], scale, radius, material);
  }
}

function addDeckPlanking(group, length, width, scale, tier, profile = "skiff") {
  const deckLength = length * 0.62 * scale;
  const deckY = 1.32 * scale;
  const plankCount = 3 + Math.min(3, tier);
  for (let i = 0; i < plankCount; i++) {
    const x = (i - (plankCount - 1) / 2) * width * 0.12 * scale;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.026 * scale, 0.025 * scale, deckLength), mats.hullDark);
    plank.position.set(x, deckY, 0);
    group.add(plank);
  }
  const beamCount = 4 + Math.min(4, tier);
  for (let i = 0; i < beamCount; i++) {
    const t = i / Math.max(1, beamCount - 1);
    const z = (-deckLength * 0.42 + t * deckLength * 0.84);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(deckWidthAt(length, width, scale, z, profile), 0.025 * scale, 0.045 * scale), mats.hullDark);
    beam.position.set(0, deckY + 0.015 * scale, z);
    group.add(beam);
  }
}

function addHullPaintBands(group, length, width, scale, spec, tier, profile = "skiff") {
  const bandLength = length * (tier >= 3 ? 0.74 : 0.62) * scale;
  const bandRows = tier >= 3 ? [0.78, 1.04] : [0.9];
  for (let side of [-1, 1]) {
    bandRows.forEach((row, index) => {
      addHullSideLine(
        group,
        length,
        width,
        scale,
        side,
        row * scale,
        -bandLength * 0.5,
        bandLength * 0.5,
        mat(index ? spec.color : 0x2f241e),
        0.022,
        index ? 0.94 : 0.9,
        profile,
      );
    });
  }
}

function mastPlan(type, length) {
  if (["skiff", "shallop", "dhow", "cat", "cog", "hoy", "longship", "knarr"].includes(type)) return [0];
  if (type === "whaler") return [-length * 0.22, length * 0.03];
  if (type === "ballooner") return [-length * 0.27, -length * 0.02];
  if (type === "superfrigate") return [-length * 0.4, -length * 0.18, length * 0.1, length * 0.34];
  if (type === "grandfrigate") return [-length * 0.38, -length * 0.16, length * 0.12, length * 0.35];
  if (type === "windrunner") return [-length * 0.38, -length * 0.15, length * 0.13, length * 0.36];
  if (type === "tidebreaker") return [-length * 0.4, -length * 0.17, length * 0.11, length * 0.38];
  if (type === "manofwar" || type === "manowar" || type === "firstrate") return [-length * 0.37, -length * 0.14, length * 0.13, length * 0.36];
  if (type === "treasure" || type === "treasureship") return [-length * 0.4, -length * 0.24, -length * 0.08, length * 0.09, length * 0.25, length * 0.39];
  if (["sloop", "storm", "dart", "lugger", "dogger", "tartane", "chassemaree"].includes(type)) return [-length * 0.18, length * 0.11];
  if (["galleon", "carrack", "merchantman", "eastindiaman", "fourthrate", "frigate", "razee", "sixthrate", "postship"].includes(type)) {
    return [-length * 0.3, -length * 0.04, length * 0.1];
  }
  return [-length * 0.24, length * 0.1];
}

function addStandingRigging(group, type, length, width, scale, tier) {
  if (["cat"].includes(type)) return;
  const topY = (4.25 + Math.min(1.2, tier * 0.22)) * scale;
  const deckY = 1.42 * scale;
  mastPlan(type, length).forEach((mastZ) => {
    const z = mastZ * scale * MAST_SPACING_SCALE;
    for (let side of [-1, 1]) {
      const railX = side * width * 0.44 * scale;
      addRope(group, new THREE.Vector3(0, topY, z), new THREE.Vector3(railX, deckY, z - length * 0.18 * scale), scale, 0.013);
      addRope(group, new THREE.Vector3(0, topY, z), new THREE.Vector3(railX, deckY, z + length * 0.16 * scale), scale, 0.013);
    }
  });
}

function addAttachedPennant(group, length, scale, color, tier) {
  const z = length * 0.38 * scale;
  const poleHeight = (1.05 + Math.min(0.4, tier * 0.08)) * scale;
  const deckY = 1.52 * scale;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * scale, 0.036 * scale, poleHeight, 6), mats.dark);
  pole.position.set(0, deckY + poleHeight * 0.5, z);
  group.add(pole);
  const flag = clothPanel(0.72 * scale, 0.36 * scale, color, 0.025 * scale);
  flag.position.set(0.32 * scale, deckY + poleHeight * 0.78, z);
  flag.rotation.z = -0.08;
  group.add(flag);
}

function addRailCaps(group, length, width, scale, tier, profile = "skiff") {
  const actualLength = length * scale;
  const railLength = actualLength * 0.66;
  for (let side of [-1, 1]) {
    addHullSideLine(group, length, width, scale, side, 1.58 * scale, -railLength * 0.5, railLength * 0.5, mats.wood, 0.04, 1.0, profile);
  }
  if (tier >= 3) {
    const sternRail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72 * scale, 0.08 * scale, 0.08 * scale), mats.wood);
    sternRail.position.set(0, 1.62 * scale, actualLength * 0.42);
    group.add(sternRail);
  }
}

function addWindowRow(group, width, z, y, scale, color = 0xd99928, count = 5) {
  const rowWidth = width * scale * 0.56;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.2 * scale, 0.045 * scale), mat(color));
    window.position.set((t - 0.5) * rowWidth, y, z);
    group.add(window);
  }
}

function addWhalerNetRig(group, side, scale) {
  const rig = new THREE.Group();
  rig.userData.whalerNetRig = true;
  rig.userData.side = side;
  rig.userData.scale = scale;
  rig.userData.progress = 0;
  rig.position.set(side * 1.92 * scale, 1.06 * scale, -0.1 * scale);

  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, 4.85 * scale, 8), mats.wood);
  hinge.rotation.x = Math.PI / 2;
  hinge.castShadow = true;
  rig.add(hinge);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.32 * scale, 4.95 * scale), mats.dark);
  bracket.position.set(-side * 0.08 * scale, 0.02 * scale, 0);
  bracket.castShadow = true;
  rig.add(bracket);

  const frame = new THREE.Group();
  frame.userData.whalerNetFrame = true;
  rig.add(frame);

  const netMaterial = new THREE.MeshBasicMaterial({ color: 0xd8d0bd, transparent: true, opacity: 0.44, wireframe: true });
  const netPanel = new THREE.Mesh(new THREE.BoxGeometry(3.45 * scale, 0.34 * scale, 4.55 * scale), netMaterial);
  netPanel.position.set(side * 1.72 * scale, -0.2 * scale, 0);
  frame.add(netPanel);

  const boomLength = 3.55 * scale;
  [-2.28, 2.28].forEach((z) => {
    const topBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * scale, 0.038 * scale, boomLength, 7), mats.wood);
    topBoom.rotation.z = Math.PI / 2;
    topBoom.position.set(side * boomLength * 0.5, 0.08 * scale, z * scale);
    topBoom.castShadow = true;
    frame.add(topBoom);
    const lowerBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, boomLength, 7), mats.rope);
    lowerBoom.rotation.z = Math.PI / 2;
    lowerBoom.position.set(side * boomLength * 0.5, -0.42 * scale, z * scale);
    frame.add(lowerBoom);
  });

  const outerFloat = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * scale, 0.052 * scale, 4.75 * scale, 8), mat(0xb98f5a));
  outerFloat.rotation.x = Math.PI / 2;
  outerFloat.position.set(side * 3.5 * scale, -0.28 * scale, 0);
  outerFloat.castShadow = true;
  frame.add(outerFloat);

  addRope(frame, new THREE.Vector3(0, 0.12 * scale, -2.35 * scale), new THREE.Vector3(side * 3.45 * scale, -0.38 * scale, -2.35 * scale), scale, 0.016);
  addRope(frame, new THREE.Vector3(0, 0.12 * scale, 2.35 * scale), new THREE.Vector3(side * 3.45 * scale, -0.38 * scale, 2.35 * scale), scale, 0.016);
  group.add(rig);
  group.userData.whalerNetRigs = group.userData.whalerNetRigs || [];
  group.userData.whalerNetRigs.push(rig);
  updateWhalerNetRig(rig, 0);
}

function updateWhalerNetRig(rig, progress) {
  const side = rig.userData.side || 1;
  const scale = rig.userData.scale || 1;
  rig.userData.progress = progress;
  const frame = rig.children.find((child) => child.userData.whalerNetFrame);
  if (!frame) return;
  frame.scale.x = 0.08 + progress * 0.92;
  frame.position.x = side * progress * 0.28 * scale;
  frame.position.y = -progress * 0.12 * scale;
  frame.rotation.z = side * (0.78 * (1 - progress));
  frame.visible = progress > 0.015;
}

function updateWhalerNetVisuals(ship, extended, dt = 0.1) {
  if (!ship) return;
  const target = extended ? 1 : 0;
  const rigs = ship.userData?.whalerNetRigs;
  if (!Array.isArray(rigs) || !rigs.length) return;
  rigs.forEach((rig) => {
    const current = rig.userData.progress || 0;
    if (current === target) return;
    const next = current + (target - current) * clamp(dt * 4.8, 0, 1);
    updateWhalerNetRig(rig, Math.abs(target - next) < 0.015 ? target : next);
  });
}

function makeTurtleFireRig(scale = 1) {
  const rig = new THREE.Group();
  rig.userData.turtleFireRig = true;
  rig.visible = false;
  const flameMats = [
    new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    new THREE.MeshBasicMaterial({ color: 0xff8a2f, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    new THREE.MeshBasicMaterial({ color: 0xd3311f, transparent: true, opacity: 0.44, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  ];
  const mouthZ = 4.32 * scale;
  const mouthY = 1.45 * scale;
  for (let i = 0; i < 3; i++) {
    const flameLength = (5.4 + i * 2.2) * scale;
    const flame = new THREE.Mesh(new THREE.ConeGeometry((0.74 + i * 0.46) * scale, flameLength, 18, 1, true), flameMats[i]);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(0, mouthY + i * 0.035 * scale, mouthZ + flameLength * 0.5 - 0.08 * scale);
    flame.userData.baseScale = 1 - i * 0.08;
    rig.add(flame);
  }
  const light = new THREE.PointLight(0xff7b2d, 1.6, 22 * scale, 1.8);
  light.position.set(0, mouthY, mouthZ + 2.2 * scale);
  light.userData.turtleFireLight = true;
  rig.add(light);
  return rig;
}

function updateTurtleFireVisual(ship, active, dt = 0.1) {
  if (!ship) return;
  const type = ship.userData?.shipType || "skiff";
  if (type !== "turtle") {
    if (ship.userData?.turtleFireRig) ship.userData.turtleFireRig.visible = false;
    return;
  }
  let rig = ship.userData.turtleFireRig;
  if (!rig) {
    rig = makeTurtleFireRig(shipVisualScale(type));
    ship.userData.turtleFireRig = rig;
    ship.add(rig);
  }
  rig.visible = Boolean(active);
  if (!rig.visible) return;
  rig.userData.phase = (rig.userData.phase || 0) + dt * 9;
  rig.children.forEach((child, index) => {
    if (child.userData?.turtleFireLight) {
      child.intensity = 1.2 + Math.sin(rig.userData.phase * 1.3) * 0.35;
      return;
    }
    const pulse = 1 + Math.sin(rig.userData.phase + index * 1.8) * 0.14;
    child.scale.setScalar((child.userData.baseScale || 1) * pulse);
    if (child.material) child.material.opacity = clamp((0.72 - index * 0.13) + Math.sin(rig.userData.phase * 1.7 + index) * 0.08, 0.28, 0.82);
  });
}

function updateTurtleFireTimers(dt) {
  if (state.shipType !== "turtle") {
    state.turtleFire = false;
    state.turtleFireTimer = 0;
    state.turtleFireCooldown = 0;
    state.turtleFireUntil = 0;
    state.turtleFireCooldownUntil = 0;
    updateTurtleFireVisual(playerShip, false, dt);
    return;
  }
  if (!state.turtleFireCooldownUntil && state.turtleFireCooldown > 0) {
    state.turtleFireCooldownUntil = timerDeadline(state.turtleFireCooldown);
  }
  state.turtleFireCooldown = timerRemainingSeconds(state.turtleFireCooldownUntil);
  if (!state.turtleFire) return;
  if (!state.turtleFireUntil && state.turtleFireTimer > 0) state.turtleFireUntil = timerDeadline(state.turtleFireTimer);
  state.turtleFireTimer = timerRemainingSeconds(state.turtleFireUntil);
  if (state.turtleFireTimer <= 0 || state.mode !== "ship" || state.viewMode !== "ship") {
    state.turtleFire = false;
    state.turtleFireTimer = 0;
    state.turtleFireUntil = 0;
    updateTurtleFireVisual(playerShip, false, dt);
  }
}

function startTurtleFireAbility() {
  if (state.shipType !== "turtle") return false;
  syncActionCooldowns();
  if (state.turtleFire) {
    toast(`Turtle fire already venting (${Math.ceil(state.turtleFireTimer || 0)}s).`);
    return true;
  }
  if ((state.turtleFireCooldown || 0) > 0) {
    toast(`Turtle fire cooling down (${Math.ceil(state.turtleFireCooldown)}s).`);
    return true;
  }
  state.turtleFire = true;
  state.turtleFireUntil = timerDeadline(TURTLE_FIRE_DURATION);
  state.turtleFireCooldownUntil = timerDeadline(TURTLE_FIRE_COOLDOWN);
  state.turtleFireTimer = timerRemainingSeconds(state.turtleFireUntil);
  state.turtleFireCooldown = timerRemainingSeconds(state.turtleFireCooldownUntil);
  updateTurtleFireVisual(playerShip, true, 1);
  multiplayer.lastSent = 0;
  toast("Turtle fire vent opened.");
  return true;
}

function turtleFireActiveForState() {
  return state.shipType === "turtle"
    && state.turtleFire
    && state.turtleFireTimer > 0
    && state.mode === "ship"
    && state.viewMode === "ship"
    && !state.fallingOffWorld
    && !state.leviathanGrabbed;
}

function turtleFireBasis(ship, type = "turtle") {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion).setY(0);
  if (forward.lengthSq() < 0.0001) {
    const rotation = shipRotationY(ship, 0);
    forward.set(Math.sin(rotation), 0, Math.cos(rotation));
  }
  forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const front = shipHullDimensions(type).length * (type === "turtle" ? 0.68 : 0.48);
  const origin = ship.position.clone().add(forward.clone().multiplyScalar(front));
  origin.y = 1.1 * shipVisualScale(type);
  return { origin, forward, right };
}

function pointInTurtleFireCone(ship, type, point, radius = 0) {
  if (!ship || !point) return false;
  const { origin, forward, right } = turtleFireBasis(ship, type);
  const delta = point.clone ? point.clone().sub(origin) : new THREE.Vector3((point.x || 0) - origin.x, 0, (point.z || 0) - origin.z);
  delta.y = 0;
  const along = delta.dot(forward);
  if (along < -radius * 0.2 || along > TURTLE_FIRE_RANGE + radius) return false;
  const widen = clamp(along / TURTLE_FIRE_RANGE, 0, 1);
  const halfWidth = TURTLE_FIRE_WIDTH * (0.42 + widen * 0.72) + radius * 0.55;
  return Math.abs(delta.dot(right)) <= halfWidth;
}

function updateTurtleFire(dt) {
  const active = turtleFireActiveForState();
  if (!active && state.turtleFire) state.turtleFire = false;
  updateTurtleFireVisual(playerShip, active, dt);
  if (!active || multiplayer.serverWorld) return;
  bots.forEach((bot) => {
    if (!pointInTurtleFireCone(playerShip, "turtle", bot.group.position, shipHitRadius(bot.shipType) * 0.45)) return;
    damageTarget(bot, TURTLE_FIRE_DPS * dt, { ignoreArmor: true, fire: TURTLE_FIRE_SMOKE, hitPosition: bot.group.position.clone() });
  });
}

function rocketeerActiveForState() {
  return state.shipType === "rocketeer"
    && state.rocketBurst
    && rocketBurstShotsRemaining() > 0
    && state.mode === "ship"
    && state.viewMode === "ship"
    && !state.fallingOffWorld
    && !state.leviathanGrabbed;
}

function rocketBurstShotsRemaining() {
  return Math.max(0, Math.floor(Number(state.rocketBurst?.shotsRemaining ?? state.rocketBurst?.remaining) || 0));
}

function rocketeerAimPoint() {
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) return aimPoint.clone().setY(0);
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation)).normalize();
  return playerShip.position.clone().add(forward.multiplyScalar(cannonRange())).setY(0);
}

function rocketeerRocketOrigin(index = 0) {
  const rotation = shipRotationY(playerShip, state.rotation);
  const { forward, right } = broadsideVectors(rotation);
  const scale = shipVisualScale("rocketeer");
  const pattern = index % 10;
  const sideOffset = ((pattern % 5) - 2) * 0.18 * scale;
  const rowOffset = Math.floor(pattern / 5) * 0.22 * scale;
  const origin = playerShip.position.clone()
    .add(forward.multiplyScalar((-0.18 + rowOffset) * shipHullDimensions("rocketeer").length))
    .add(right.multiplyScalar(sideOffset));
  origin.y = 2.18 * scale;
  return origin;
}

function launchRocketeerRocket(index = 0) {
  const aim = rocketeerAimPoint();
  const origin = rocketeerRocketOrigin(index);
  const toAim = aim.clone().sub(origin);
  toAim.y = 0;
  if (toAim.lengthSq() < 0.01) toAim.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  const requestedRange = clamp(toAim.length(), 24, cannonRange() * 2.05);
  const shotDir = rotateFlatDirection(toAim.normalize(), (Math.random() - 0.5) * ROCKET_BURST_SPREAD).normalize();
  const shotRange = clamp(requestedRange * (0.78 + Math.random() * 0.66), 20, cannonRange() * 2.25);
  const target = origin.clone().add(shotDir.clone().multiplyScalar(shotRange)).setY(0);
  const options = {
    target,
    ammoType: "rocketburst",
    targetKind: "any",
    ballistic: true,
    startY: origin.y,
    baseDamage: ROCKET_BURST_DAMAGE,
    rangeDamage: false,
    gravity: CANNONBALL_GRAVITY * 1.55,
  };
  makeProjectile(playerId, origin, shotDir, ROCKET_BURST_DAMAGE, shotRange, options);
  publishShot(origin, shotDir, ROCKET_BURST_DAMAGE, shotRange, target, "rocketburst", options);
}

function startRocketeerBurstAbility() {
  if (state.shipType !== "rocketeer") return false;
  syncActionCooldowns();
  if (rocketBurstShotsRemaining() > 0) {
    toast(`Rocket burst firing (${rocketBurstShotsRemaining()} rockets left in this burst).`);
    return true;
  }
  if ((state.rocketCooldown || 0) > 0) {
    toast(`Rocket burst reloading (${Math.ceil(state.rocketCooldown)}s).`);
    return true;
  }
  if (ammoCount("rocketburst") <= 0) {
    toast("Buy Rocket Burst ammo before using the Rocketeer.");
    return true;
  }
  state.ammo.rocketburst = Math.max(0, ammoCount("rocketburst") - 1);
  state.rocketBurst = { shotsRemaining: ROCKET_BURST_COUNT, remaining: ROCKET_BURST_COUNT, totalShots: ROCKET_BURST_COUNT, timer: 0, fired: 0, ammoBurstsSpent: 1 };
  state.rocketCooldownUntil = timerDeadline(ROCKET_BURST_COOLDOWN);
  state.rocketCooldown = timerRemainingSeconds(state.rocketCooldownUntil);
  multiplayer.lastSent = 0;
  toast(`Rocket burst launched: ${ROCKET_BURST_COUNT} rockets.`);
  updateHud();
  return true;
}

function updateRocketeerBurst(dt) {
  if (state.shipType !== "rocketeer") {
    state.rocketBurst = null;
    state.rocketCooldown = 0;
    state.rocketCooldownUntil = 0;
    return;
  }
  if (!state.rocketCooldownUntil && state.rocketCooldown > 0) state.rocketCooldownUntil = timerDeadline(state.rocketCooldown);
  state.rocketCooldown = timerRemainingSeconds(state.rocketCooldownUntil);
  if (!state.rocketBurst) return;
  if (!rocketeerActiveForState()) {
    state.rocketBurst = null;
    return;
  }
  state.rocketBurst.timer -= dt;
  while (state.rocketBurst && rocketBurstShotsRemaining() > 0 && state.rocketBurst.timer <= 0) {
    launchRocketeerRocket(state.rocketBurst.fired || 0);
    const nextShots = rocketBurstShotsRemaining() - 1;
    state.rocketBurst.shotsRemaining = nextShots;
    state.rocketBurst.remaining = nextShots;
    state.rocketBurst.fired = (state.rocketBurst.fired || 0) + 1;
    state.rocketBurst.timer += ROCKET_BURST_INTERVAL;
  }
  if (rocketBurstShotsRemaining() <= 0) state.rocketBurst = null;
}

function updateRemoteTurtleFires(dt) {
  remotePlayers.forEach((remote) => {
    const active = remote.shipType === "turtle" && remote.turtleFire && remote.mode === "ship";
    updateTurtleFireVisual(remote.group, active, dt);
    if (!active || state.mode !== "ship" || state.viewMode !== "ship") return;
    if (pointInTurtleFireCone(remote.group, "turtle", playerShip.position, shipHitRadius(state.shipType) * 0.55)) {
      damageTarget(state, TURTLE_FIRE_DPS * dt, { ignoreArmor: true, fire: TURTLE_FIRE_SMOKE, hitPosition: playerShip.position.clone() });
    }
  });
}

function addLargeShipArchitecture(group, type, length, width, scale, spec, tier, profile = "skiff") {
  const actualLength = length * scale;
  const actualWidth = width * scale;
  const sternZ = actualLength * 0.34;
  const bowZ = -actualLength * 0.34;
  const castleColor = ["galleon", "rocketeer", "carrack", "eastindiaman", "merchantman", "treasure", "treasureship"].includes(type) ? 0x654231 : 0x40342f;
  const interiorTypes = new Set(["carrack", "eastindiaman", "firstrate", "fourthrate", "galleon", "grandfrigate", "manofwar", "manowar", "merchantman", "razee", "sixthrate", "postship", "superfrigate", "tidebreaker", "treasure", "treasureship", "windrunner"]);
  const hasInterior = interiorTypes.has(type);
  const postShipCabin = type === "postship";
  const treasureCabin = type === "treasure" || type === "treasureship";
  const sternWallMat = mat(castleColor);
  if (hasInterior) {
    sternWallMat.side = THREE.DoubleSide;
    sternWallMat.needsUpdate = true;
  }
  const sternDeckHeight = treasureCabin ? 1.22 * scale : postShipCabin ? 1.04 * scale : 0.7 * scale;
  const sternDeckY = treasureCabin ? 1.86 * scale : postShipCabin ? 1.74 * scale : 1.57 * scale;
  const sternRoofY = treasureCabin ? 2.62 * scale : postShipCabin ? 2.34 * scale : 2.01 * scale;
  const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.68, sternDeckHeight, actualLength * 0.17), sternWallMat);
  sternDeck.position.set(0, sternDeckY, sternZ);
  sternDeck.castShadow = true;
  group.add(sternDeck);
  const sternRoofMat = hasInterior ? mats.hullDark.clone() : mats.hullDark;
  if (hasInterior) {
    sternRoofMat.side = THREE.DoubleSide;
    sternRoofMat.needsUpdate = true;
  }
  const sternRoof = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.72, 0.16 * scale, actualLength * 0.19), sternRoofMat);
  sternRoof.position.set(0, sternRoofY, sternZ);
  sternRoof.castShadow = true;
  group.add(sternRoof);
  addWindowRow(group, width, sternZ + actualLength * 0.09, (treasureCabin ? 2.08 : postShipCabin ? 1.92 : 1.68) * scale, scale, 0xd99928, treasureCabin ? 8 : tier >= 5 ? 7 : 5);
  if (treasureCabin) addWindowRow(group, width * 0.86, sternZ + actualLength * 0.09, 1.64 * scale, scale, 0xffd36a, 6);
  else if (postShipCabin) addWindowRow(group, width * 0.82, sternZ + actualLength * 0.09, 1.52 * scale, scale, 0xffd36a, 4);
  if (hasInterior) {
    const doorZ = sternZ - actualLength * 0.087;
    const generousCabinDoor = ["grandfrigate", "manofwar", "postship", "superfrigate", "tidebreaker", "treasure", "treasureship", "windrunner"].includes(type);
    const doorWidth = treasureCabin ? 1.12 : generousCabinDoor ? 0.96 : 0.76;
    const doorHeight = treasureCabin ? 1.05 : postShipCabin ? 0.96 : 0.68;
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth * scale, doorHeight * scale, 0.055 * scale), mats.dark);
    door.position.set(0, (treasureCabin ? 1.72 : postShipCabin ? 1.62 : 1.48) * scale, doorZ - 0.012 * scale);
    door.castShadow = false;
    group.add(door);
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(0.86 * scale, 0.045 * scale, 0.2 * scale), mats.plank);
    threshold.position.set(0, 1.18 * scale, doorZ - 0.08 * scale);
    threshold.castShadow = true;
    group.add(threshold);
    const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * (treasureCabin ? 0.62 : postShipCabin ? 0.54 : 0.46), 0.035 * scale, actualLength * (treasureCabin ? 0.13 : postShipCabin ? 0.105 : 0.08)), mats.plank);
    interiorFloor.position.set(0, 1.23 * scale, sternZ - actualLength * 0.005);
    interiorFloor.receiveShadow = true;
    group.add(interiorFloor);
    const table = new THREE.Mesh(new THREE.BoxGeometry(0.74 * scale, 0.14 * scale, 0.48 * scale), mat(0x6b482f));
    table.position.set(0, 1.42 * scale, sternZ + actualLength * 0.012);
    table.castShadow = true;
    group.add(table);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.32, 0.18 * scale, 0.16 * scale), mat(0x493425));
    bench.position.set(0, 1.34 * scale, sternZ + actualLength * 0.05);
    bench.castShadow = true;
    group.add(bench);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.3 * scale, 0.32 * scale), mats.crate);
    crate.position.set(-actualWidth * 0.18, 1.4 * scale, sternZ - actualLength * 0.026);
    crate.castShadow = true;
    group.add(crate);
    const innerMat = mat(0x5a4638);
    innerMat.side = THREE.DoubleSide;
    innerMat.needsUpdate = true;
    const interiorWallHeight = treasureCabin ? 1.08 : postShipCabin ? 0.94 : 0.56;
    const interiorWallY = treasureCabin ? 1.86 : postShipCabin ? 1.72 : 1.54;
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * (treasureCabin ? 0.62 : 0.54), interiorWallHeight * scale, 0.035 * scale), innerMat);
    rearWall.position.set(0, interiorWallY * scale, sternZ + actualLength * 0.071);
    group.add(rearWall);
    for (const side of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, interiorWallHeight * scale, actualLength * (treasureCabin ? 0.135 : 0.115)), innerMat);
      sideWall.position.set(side * actualWidth * 0.32, interiorWallY * scale, sternZ + actualLength * 0.002);
      group.add(sideWall);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 8, 6), mats.gold);
      lamp.position.set(side * actualWidth * 0.25, (treasureCabin ? 2.28 : postShipCabin ? 2.02 : 1.72) * scale, sternZ - actualLength * 0.022);
      group.add(lamp);
    }
    if (type === "postship") {
      const chart = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.028 * scale, 0.34 * scale), mat(0xd8c28f));
      chart.position.set(0.04 * scale, 1.51 * scale, sternZ + actualLength * 0.013);
      chart.rotation.y = 0.14;
      group.add(chart);
      const writingDesk = new THREE.Mesh(new THREE.BoxGeometry(0.82 * scale, 0.16 * scale, 0.42 * scale), mat(0x6b482f));
      writingDesk.position.set(-actualWidth * 0.11, 1.46 * scale, sternZ - actualLength * 0.022);
      writingDesk.castShadow = true;
      group.add(writingDesk);
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.34 * scale, 0.28 * scale), mat(0x493425));
      chair.position.set(-actualWidth * 0.11, 1.37 * scale, sternZ - actualLength * 0.052);
      chair.castShadow = true;
      group.add(chair);
      const seaChest = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.32 * scale, 0.32 * scale), mat(0x3e2b21));
      seaChest.position.set(actualWidth * 0.19, 1.4 * scale, sternZ - actualLength * 0.03);
      seaChest.castShadow = true;
      group.add(seaChest);
      for (const side of [-1, 1]) {
        const bunk = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.16 * scale, 0.68 * scale), mat(0x493425));
        bunk.position.set(side * actualWidth * 0.22, 1.36 * scale, sternZ + actualLength * 0.028);
        bunk.castShadow = true;
        group.add(bunk);
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.045 * scale, 0.52 * scale), mat(side < 0 ? 0x4051a8 : 0xb84f44));
        blanket.position.set(side * actualWidth * 0.22, 1.47 * scale, sternZ + actualLength * 0.028);
        group.add(blanket);
      }
      const aftShelf = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.36, 0.08 * scale, 0.12 * scale), mats.wood);
      aftShelf.position.set(0, 1.98 * scale, sternZ + actualLength * 0.059);
      aftShelf.castShadow = true;
      group.add(aftShelf);
      for (let i = -1; i <= 1; i++) {
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.22 * scale, 0.11 * scale), mat(i === 0 ? 0xb84f44 : 0x4051a8));
        book.position.set(i * 0.12 * scale, 2.13 * scale, sternZ + actualLength * 0.058);
        group.add(book);
      }
      for (const side of [-1, 1]) {
        const ceilingBeam = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.08 * scale, actualLength * 0.11), mats.wood);
        ceilingBeam.position.set(side * actualWidth * 0.17, 2.2 * scale, sternZ + actualLength * 0.002);
        ceilingBeam.castShadow = true;
        group.add(ceilingBeam);
      }
    }
    if (type === "treasure" || type === "treasureship") {
      const chart = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale, 0.03 * scale, 0.42 * scale), mat(0xd8c28f));
      chart.position.set(0.02 * scale, 1.52 * scale, sternZ + actualLength * 0.012);
      chart.rotation.y = -0.1;
      group.add(chart);
      for (const side of [-1, 1]) {
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.62 * scale, 0.82 * scale), mat(0xaa3e2e));
        screen.position.set(side * actualWidth * 0.18, 1.66 * scale, sternZ - actualLength * 0.04);
        screen.castShadow = true;
        group.add(screen);
        const screenTrim = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.08 * scale, 0.9 * scale), mats.gold);
        screenTrim.position.set(side * actualWidth * 0.18, 1.98 * scale, sternZ - actualLength * 0.04);
        group.add(screenTrim);
        const hangingLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.11 * scale, 0.22 * scale, 8), mats.gold);
        hangingLamp.position.set(side * actualWidth * 0.2, 2.24 * scale, sternZ + actualLength * 0.028);
        group.add(hangingLamp);
      }
      const lacquerChest = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.32 * scale, 0.34 * scale), mat(0x7a231e));
      lacquerChest.position.set(actualWidth * 0.2, 1.4 * scale, sternZ + actualLength * 0.055);
      lacquerChest.castShadow = true;
      group.add(lacquerChest);
      const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.54 * scale, 0.05 * scale, 0.36 * scale), mats.gold);
      chestBand.position.copy(lacquerChest.position).y += 0.18 * scale;
      group.add(chestBand);
      for (const side of [-1, 1]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.08 * scale, actualLength * 0.13), mats.wood);
        beam.position.set(side * actualWidth * 0.21, 2.44 * scale, sternZ);
        beam.castShadow = true;
        group.add(beam);
      }
    }
  }

  const quarterDepth = actualLength * 0.12;
  for (let side of [-1, 1]) {
    const quarter = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.16, 0.46 * scale, quarterDepth), mat(castleColor));
    quarter.position.set(side * hullSideXAt(length, width, scale, sternZ, 0.9, profile), 1.5 * scale, sternZ + actualLength * 0.02);
    quarter.castShadow = true;
    group.add(quarter);
    const quarterWindow = new THREE.Mesh(new THREE.BoxGeometry(0.045 * scale, 0.2 * scale, quarterDepth * 0.52), mats.gold);
    quarterWindow.position.set(side * hullSideXAt(length, width, scale, sternZ, 1.02, profile), 1.54 * scale, sternZ + actualLength * 0.02);
    group.add(quarterWindow);
  }

  const forecastle = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.48, 0.42 * scale, actualLength * 0.12), mat(castleColor));
  forecastle.position.set(0, 1.42 * scale, bowZ);
  forecastle.castShadow = true;
  group.add(forecastle);
  const forecastleRail = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.52, 0.08 * scale, actualLength * 0.13), mats.wood);
  forecastleRail.position.set(0, 1.69 * scale, bowZ);
  group.add(forecastleRail);

  const rows = tier >= 5 ? [0.98, 1.2] : [1.06];
  rows.forEach((row, rowIndex) => {
    for (let side of [-1, 1]) {
      for (let i = 0; i < 7 + rowIndex * 2; i++) {
        const t = i / (6 + rowIndex * 2);
        const z = -actualLength * 0.27 + t * actualLength * 0.54;
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.17 * scale, 0.18 * scale), mats.dark);
        const sideX = side * hullSideXAt(length, width, scale, z, 0.98, profile);
        port.position.set(sideX, row * scale, z);
        group.add(port);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.062 * scale, 0.02 * scale, 0.23 * scale), mat(spec.color));
        trim.position.set(sideX + side * 0.01 * scale, (row + 0.12) * scale, z);
        group.add(trim);
      }
    }
  });
}

function addTreasureJunkDetails(group, hullLength, hullWidth, scale, spec, profile = "treasure") {
  const actualLength = hullLength * scale;
  const actualWidth = hullWidth * scale;
  const redWood = mat(0x7e3d2a);
  const lacquer = mat(0x9f3428);
  const deckGold = mat(0xd6a83c);
  const centerWalk = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.5, 0.045 * scale, actualLength * 0.58), mats.plank);
  centerWalk.position.set(0, 1.56 * scale, -actualLength * 0.02);
  centerWalk.castShadow = true;
  centerWalk.receiveShadow = true;
  group.add(centerWalk);
  const bowStructureZ = -actualLength * 0.43;
  const bowBase = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.46, 0.46 * scale, actualLength * 0.18), lacquer);
  bowBase.position.set(0, 1.46 * scale, bowStructureZ);
  bowBase.castShadow = true;
  group.add(bowBase);
  const bowConnector = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.42, 0.08 * scale, actualLength * 0.1), redWood);
  bowConnector.position.set(0, 1.58 * scale, -actualLength * 0.31);
  bowConnector.castShadow = true;
  group.add(bowConnector);
  const bowPlatform = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.52, 0.12 * scale, actualLength * 0.19), redWood);
  bowPlatform.position.set(0, 1.7 * scale, bowStructureZ);
  bowPlatform.castShadow = true;
  group.add(bowPlatform);
  const bowFront = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.38, 0.3 * scale, 0.08 * scale), mat(0x6b261f));
  bowFront.position.set(0, 1.54 * scale, -actualLength * 0.535);
  bowFront.castShadow = true;
  group.add(bowFront);
  addWindowRow(group, hullWidth * 0.42, -actualLength * 0.535, 1.57 * scale, scale, 0xffd36a, 3);
  const aftHouse = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.68, 0.92 * scale, actualLength * 0.32), redWood);
  aftHouse.position.set(0, 2.08 * scale, actualLength * 0.39);
  aftHouse.castShadow = true;
  group.add(aftHouse);
  const aftCover = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.82, 0.14 * scale, actualLength * 0.36), mats.hullDark);
  aftCover.position.set(0, 2.62 * scale, actualLength * 0.39);
  aftCover.castShadow = true;
  group.add(aftCover);
  const aftDeckLip = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.78, 0.16 * scale, actualLength * 0.2), redWood);
  aftDeckLip.position.set(0, 2.78 * scale, actualLength * 0.44);
  aftDeckLip.castShadow = true;
  group.add(aftDeckLip);
  const aftHullCover = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.68, 0.86 * scale, actualLength * 0.12), redWood);
  aftHullCover.position.set(0, 1.58 * scale, actualLength * 0.535);
  aftHullCover.castShadow = true;
  aftHullCover.receiveShadow = true;
  group.add(aftHullCover);
  const aftLowerCap = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.68, 0.16 * scale, actualLength * 0.18), redWood);
  aftLowerCap.position.set(0, 1.12 * scale, actualLength * 0.5);
  aftLowerCap.castShadow = true;
  aftLowerCap.receiveShadow = true;
  group.add(aftLowerCap);
  for (const side of [-1, 1]) {
    const galleryZ = actualLength * 0.02;
    const galleryX = side * hullSideXAt(hullLength, hullWidth, scale, galleryZ, 0.91, profile);
    const gallery = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.42 * scale, actualLength * 0.36), lacquer);
    gallery.position.set(galleryX, 1.55 * scale, galleryZ);
    gallery.castShadow = true;
    group.add(gallery);
    const galleryBack = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.36 * scale, actualLength * 0.36), redWood);
    galleryBack.position.set(galleryX - side * 0.16 * scale, 1.51 * scale, galleryZ);
    galleryBack.castShadow = true;
    group.add(galleryBack);
    for (let i = 0; i < 7; i++) {
      const z = galleryZ - actualLength * 0.16 + (i / 6) * actualLength * 0.32;
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, 0.18 * scale, 0.26 * scale), mats.gold);
      window.position.set(galleryX + side * 0.18 * scale, 1.62 * scale, z);
      group.add(window);
    }
  }
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const z = -actualLength * 0.34 + t * actualLength * 0.68;
    const ribWidth = deckWidthAt(hullLength, hullWidth, scale, z, profile) * 0.96;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(ribWidth, 0.07 * scale, 0.1 * scale), mats.hullDark);
    rib.position.set(0, 1.68 * scale, z);
    rib.castShadow = true;
    group.add(rib);
  }
  const sternFace = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.66, 0.72 * scale, 0.08 * scale), redWood);
  sternFace.position.set(0, 2.1 * scale, actualLength * 0.535);
  sternFace.castShadow = true;
  group.add(sternFace);
  addWindowRow(group, hullWidth * 0.72, actualLength * 0.515, 2.04 * scale, scale, 0xffd36a, 5);
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.26 * scale, 1.22 * scale, 8), deckGold);
  prow.rotation.x = Math.PI / 2.2;
  prow.position.set(0, 1.5 * scale, -actualLength * 0.59);
  prow.castShadow = true;
  group.add(prow);
  const prowFin = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.56 * scale, 0.5 * scale), lacquer);
  prowFin.position.set(0, 1.72 * scale, -actualLength * 0.53);
  prowFin.castShadow = true;
  group.add(prowFin);
}

function addRocketeerDetails(group, hullLength, hullWidth, scale) {
  const actualLength = hullLength * scale;
  const actualWidth = hullWidth * scale;
  const iron = mat(0x2e3234);
  const rocketRed = mat(0xb83728);
  const rackWood = mat(0x5d3a27);
  const deckY = 1.82 * scale;
  const rackZs = [-actualLength * 0.17, actualLength * 0.02, actualLength * 0.2];
  rackZs.forEach((z, row) => {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.38, 0.065 * scale, 0.38 * scale), rackWood);
    platform.position.set(0, deckY - 0.08 * scale, z);
    platform.castShadow = true;
    group.add(platform);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = side * (actualWidth * (0.08 + i * 0.036));
        const start = new THREE.Vector3(x, deckY, z + 0.14 * scale);
        const end = new THREE.Vector3(x - side * 0.05 * scale, deckY + (0.38 + row * 0.035) * scale, z - 0.44 * scale);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032 * scale, 0.032 * scale, 1, 8), iron);
        setCylinderBetween(tube, start, end);
        tube.castShadow = true;
        group.add(tube);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.052 * scale, 0.14 * scale, 8), rocketRed);
        cap.position.copy(end);
        cap.rotation.x = -Math.PI / 2.25;
        cap.rotation.z = -side * 0.08;
        cap.castShadow = true;
        group.add(cap);
      }
    }
  });
  const powderChest = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.28, 0.34 * scale, 0.52 * scale), mats.hullDark);
  powderChest.position.set(0, 1.68 * scale, -actualLength * 0.34);
  powderChest.castShadow = true;
  group.add(powderChest);
  const brassBand = new THREE.Mesh(new THREE.BoxGeometry(actualWidth * 0.3, 0.055 * scale, 0.56 * scale), mats.gold);
  brassBand.position.copy(powderChest.position).y += 0.2 * scale;
  group.add(brassBand);
}

function addHistoricalDetails(group, type, hullLength, hullWidth, scale, spec, profile = "skiff") {
  const tier = spec.price > 16000 ? 5 : spec.price > 10000 ? 4 : spec.price > 5500 ? 3 : spec.price > 2500 ? 2 : spec.price > 800 ? 1 : 0;
  const customCabinTypes = new Set([
    "bombketch", "caravel", "carrack", "cog", "dart", "eastindiaman", "fluyt", "fourthrate",
    "galley", "galleon", "rocketeer", "grandfrigate", "hoy", "junk", "ketch", "knarr", "manofwar", "manowar", "merchantman",
    "packet", "pink", "pinnace", "razee", "schooner", "modernschooner", "sloop", "storm", "superfrigate", "tidebreaker", "treasure", "treasureship",
    "xebec", "tartane", "firstrate", "windrunner", "whaler", "ballooner", "chassemaree",
    "polacre", "sixthrate", "postship", "turtle",
  ]);
  const customDeckTypes = new Set([
    "carrack", "eastindiaman", "firstrate", "fourthrate", "galleon", "rocketeer", "ironclad",
    "knarr", "manofwar", "manowar", "merchantman", "razee", "treasure", "treasureship", "turtle",
  ]);
  const customProwTypes = new Set(["cat", "dhow", "galley", "longship", "turtle", "ironclad"]);
  const gunDeckTypes = new Set([
    "bombketch", "brig", "brigantine", "barque", "barquentine", "corvette", "frigate", "fourthrate",
    "galleon", "rocketeer", "manofwar", "manowar", "merchantman", "eastindiaman", "razee", "storm", "superfrigate", "tidebreaker", "treasure", "treasureship",
    "firstrate", "snow", "sixthrate", "postship",
  ]);
  addHullDetailLines(group, hullLength, hullWidth, scale, tier, profile);
  addDeckPlanking(group, hullLength, hullWidth, scale, tier, profile);
  addHullPaintBands(group, hullLength, hullWidth, scale, spec, tier, profile);
  if (!customDeckTypes.has(type)) addDeckFittings(group, hullLength, hullWidth, scale, tier, spec.color, profile);
  if (!customProwTypes.has(type)) addBowspritAndRudder(group, hullLength, hullWidth, scale, tier);
  addAttachedPennant(group, hullLength, scale, spec.color, tier);
  addRailCaps(group, hullLength, hullWidth, scale, tier, profile);
  if ((tier >= 4 && !["whaler", "ballooner", "turtle"].includes(type)) || ["galleon", "rocketeer", "carrack", "eastindiaman", "superfrigate", "tidebreaker", "treasure", "treasureship", "manofwar", "manowar", "fourthrate", "firstrate", "razee", "sixthrate", "postship"].includes(type)) {
    addLargeShipArchitecture(group, type, hullLength, hullWidth, scale, spec, tier, profile);
  }
  if (type === "treasure" || type === "treasureship") addTreasureJunkDetails(group, hullLength, hullWidth, scale, spec, profile);
  if (type === "rocketeer") addRocketeerDetails(group, hullLength, hullWidth, scale);
  if (shipUsesCenterlineGun(type)) {
    addCenterlineDeckCannon(group, hullLength, scale);
  } else {
    addCannonPorts(group, shipSideCannons(type), hullWidth, hullLength, scale, profile);
  }
  if (!customCabinTypes.has(type)) {
    if (tier >= 2) addCabin(group, 0, hullLength * 0.22, Math.min(2.4, hullWidth * 0.68), 1.35 + tier * 0.18, scale, 0x7a5030);
    if (tier >= 3) {
      addCabin(group, 0, -hullLength * 0.24, Math.min(2.0, hullWidth * 0.58), 1.0, scale * 0.9, 0x604237);
      addSternGallery(group, hullLength, hullWidth, scale, 0x5f4235);
    }
  }
  if (tier >= 3) {
    const figure = new THREE.Mesh(new THREE.ConeGeometry(0.2 * scale, 0.8 * scale, 8), mats.gold);
    figure.rotation.x = Math.PI / 2;
    figure.position.set(0, 1.22 * scale, -hullLength * 0.5 * scale);
    group.add(figure);
  }
  if (type === "skiff" || type === "cat" || type === "longship") {
    addOars(group, type === "longship" ? 7 : type === "cat" ? 4 : 3, hullWidth, hullLength, scale, profile);
  }
}

function makeShip(type = "skiff", remote = false) {
  const spec = getShipStats(type);
  type = spec.id;
  const group = new THREE.Group();
  group.userData.shipType = type;
  group.userData.hitRadius = shipHitRadius(type);
  const scale = shipVisualScale(type);
  const hullSize = {
    shallop: [5.6, 1.85],
    pinnace: [6.5, 1.75],
    hoy: [5.7, 2.75],
    dart: [7.7, 1.75],
    clipper: [7.4, 2.35],
    galleon: [7.2, 3.25],
    rocketeer: [7.2, 3.25],
    brig: [6.9, 3.05],
    brigantine: [7.2, 2.75],
    cat: [5.8, 1.45],
    turtle: [6.2, 3.55],
    bombketch: [6.4, 3.4],
    storm: [8.1, 2.25],
    sloop: [7.4, 2.0],
    dhow: [7.1, 2.25],
    cog: [6.2, 3.05],
    hoy: [5.9, 2.85],
    dogger: [6.6, 2.2],
    xebec: [8.3, 2.4],
    tartane: [7.2, 2.15],
    caravel: [6.9, 2.65],
    pink: [6.6, 2.55],
    ketch: [6.9, 2.5],
    frigate: [8.2, 2.9],
    corvette: [7.8, 2.65],
    razee: [8.5, 3.0],
    sixthrate: [8.0, 2.72],
    postship: [8.3, 2.85],
    grandfrigate: [8.9, 3.18],
    superfrigate: [9.6, 3.55],
    windrunner: [9.4, 2.55],
    tidebreaker: [9.4, 2.75],
    carrack: [7.4, 3.5],
    manowar: [8.4, 3.8],
    fourthrate: [8.3, 3.65],
    firstrate: [9.0, 4.0],
    manofwar: [9.0, 4.08],
    longship: [8.7, 1.7],
    knarr: [6.5, 2.6],
    lugger: [7.0, 2.15],
    galley: [8.8, 2.2],
    snow: [7.5, 2.8],
    packet: [7.8, 2.45],
    barquentine: [7.7, 2.55],
    barque: [8.0, 2.8],
    fluyt: [7.0, 3.4],
    merchantman: [7.4, 3.45],
    eastindiaman: [7.8, 3.55],
    treasure: [12.0, 4.45],
    treasureship: [12.0, 4.75],
    ironclad: [7.8, 3.7],
  }[type] || [6.5, 2.7];
  const profile = spec.model || type;
  const darkHulled = ["brig", "brigantine", "corvette", "frigate", "sixthrate", "postship", "razee", "grandfrigate", "superfrigate", "tidebreaker", "galleon", "rocketeer", "eastindiaman", "carrack", "fourthrate", "manofwar", "manowar", "firstrate", "ironclad"].includes(type);
  const isTreasureHull = type === "treasure" || type === "treasureship";
  const hullMaterial = type === "modernschooner"
    ? mat(0xf2f4ef)
    : isTreasureHull
      ? mat(0x6f3f25)
      : darkHulled ? mats.hullDark : mats.hull;
  const hullHeight = (isTreasureHull ? 1.34 : 1.15) * scale;
  group.add(hullMesh(hullSize[0] * scale, hullSize[1] * scale, hullHeight, hullMaterial, profile));
  addHullEndCaps(group, hullSize[0], hullSize[1], scale, hullMaterial, profile);
  [-1, 1].forEach((side) => {
    addHullSideLine(
      group,
      hullSize[0],
      hullSize[1],
      scale,
      side,
      1.4 * scale,
      -hullSize[0] * 0.31 * scale,
      hullSize[0] * 0.31 * scale,
      mat(spec.color),
      0.035,
      0.96,
      profile,
    );
  });
  const deckMaterial = type === "modernschooner" ? mat(0xf8fbff) : mats.wood;
  const deck = hullMesh(hullSize[0] * (isTreasureHull ? 0.64 : 0.58) * scale, hullSize[1] * (isTreasureHull ? 0.68 : 0.62) * scale, (isTreasureHull ? 0.28 : 0.24) * scale, deckMaterial, profile);
  deck.position.y = (isTreasureHull ? 1.24 : 1.08) * scale;
  deck.castShadow = true;
  group.add(deck);

  const deckRailMat = type === "modernschooner" ? mat(0xf8fbff) : mats.wood;
  [-1, 1].forEach((side) => {
    const railPath = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const z = (-hullSize[0] * 0.27 + t * hullSize[0] * 0.54) * scale;
      const x = side * hullSideXAt(hullSize[0], hullSize[1], scale, z, 0.98, profile);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.055 * scale, 0.52 * scale, 6), deckRailMat);
      post.position.set(x, 1.55 * scale, z);
      post.castShadow = true;
      group.add(post);
      railPath.push(new THREE.Vector3(x, 1.81 * scale, z));
    }
    for (let i = 1; i < railPath.length; i++) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 1, 6), deckRailMat);
      setCylinderBetween(rail, railPath[i - 1], railPath[i]);
      rail.castShadow = true;
      group.add(rail);
    }
  });
  const stemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.13 * scale, 1.25 * scale, 7), mat(spec.color));
  stemPost.position.set(0, 1.1 * scale, (-hullSize[0] * 0.5) * scale);
  stemPost.rotation.x = -0.28;
  stemPost.castShadow = true;
  group.add(stemPost);
  const sternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, 1.05 * scale, 7), mats.hullDark);
  sternPost.position.set(0, 1.06 * scale, (hullSize[0] * 0.47) * scale);
  sternPost.rotation.x = 0.2;
  sternPost.castShadow = true;
  group.add(sternPost);
  const keelLine = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.045 * scale, hullSize[0] * 0.78 * scale, 6), mats.dark);
  keelLine.rotation.x = Math.PI / 2;
  keelLine.position.set(0, 0.16 * scale, -0.05 * scale);
  group.add(keelLine);
  if (type === "superfrigate") {
    addSquareSail(group, -0.98, -3.72, 1.34, 0xf6ead0, 3);
    addSquareSail(group, -0.34, -1.62, 1.42, 0xfff0c4, 3);
    addSquareSail(group, 0.34, 0.94, 1.3, 0xf6ead0, 3);
    addSquareSail(group, 1.02, 3.32, 1.14, 0xfff0c4, 3);
    const commandDeck = new THREE.Mesh(new THREE.BoxGeometry(2.7 * scale, 0.42 * scale, 1.2 * scale), mat(0x3b3440));
    commandDeck.position.set(0, 2.18 * scale, 2.8 * scale);
    commandDeck.castShadow = true;
    group.add(commandDeck);
    const commandRoof = new THREE.Mesh(new THREE.BoxGeometry(3.0 * scale, 0.16 * scale, 1.38 * scale), mats.gold);
    commandRoof.position.set(0, 2.48 * scale, 2.8 * scale);
    commandRoof.castShadow = true;
    group.add(commandRoof);
    [-1, 1].forEach((side) => {
      const armorBand = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.16 * scale, 5.9 * scale), mats.gold);
      armorBand.position.set(side * 1.76 * scale, 1.32 * scale, -0.18 * scale);
      armorBand.castShadow = true;
      group.add(armorBand);
    });
  } else if (type === "grandfrigate") {
    addSquareSail(group, -0.85, -3.42, 1.2, 0xf2ead5, 2);
    addSquareSail(group, -0.25, -1.42, 1.28, 0xf8efd8, 3);
    addSquareSail(group, 0.42, 1.04, 1.16, 0xf2ead5, 2);
    addSquareSail(group, 0.96, 3.12, 1.0, 0xf5ead8, 2);
  } else if (type === "windrunner") {
    addSquareSail(group, -0.65, -3.55, 1.02, 0xfff3ce, 2);
    addSquareSail(group, -0.1, -1.42, 1.12, 0xffdf9b, 2);
    addSquareSail(group, 0.42, 1.08, 0.98, 0xfff3ce, 2);
    addSquareSail(group, 0.72, 3.18, 0.9, 0xfff3ce, 3);
  } else if (type === "tidebreaker") {
    addSquareSail(group, -0.86, -3.74, 1.18, 0xe8fbff, 3);
    addSquareSail(group, -0.25, -1.58, 1.28, 0xcff6ff, 3);
    addSquareSail(group, 0.42, 1.04, 1.16, 0xe8fbff, 3);
    addSquareSail(group, 0.92, 3.42, 1.02, 0xcff6ff, 3);
    [-1, 1].forEach((side) => {
      const runnerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.18 * scale, 6.4 * scale), mat(0x95efff));
      runnerTrim.position.set(side * 1.45 * scale, 1.38 * scale, -0.15 * scale);
      runnerTrim.castShadow = true;
      group.add(runnerTrim);
    });
  } else if (type === "clipper") {
    addSquareSail(group, -0.25, -1.35, 0.92, 0xfff3ce, 2);
    addSquareSail(group, 0.35, 0.9, 0.78, 0xffdf9b, 2);
  } else if (type === "brig" || type === "brigantine") {
    addSquareSail(group, -0.45, -1.1, 0.9, 0xf2ead5, 2);
    if (type === "brigantine") addSail(group, 0.55, 1.15, 0.86, 0xf8efd8);
    else addSquareSail(group, 0.55, 1.15, 0.86, 0xf8efd8, 2);
    const armor = hullMesh(5.2 * scale, 3.0 * scale, 0.16 * scale, mat(0x65717b), "brig");
    armor.position.y = 1.02 * scale;
    group.add(armor);
  } else if (type === "junk") {
    addSquareSail(group, -0.3, -0.7, 0.9, 0xf4e1b4, 3);
    addSquareSail(group, 0.45, 0.82, 0.68, 0xf0dba2, 2);
    const house = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 0.62 * scale, 1.18 * scale), mats.wood);
    house.position.set(0, 1.55 * scale, 1.55 * scale);
    house.castShadow = true;
    group.add(house);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.25 * scale, 0.38 * scale, 1.45 * scale), mat(0xb7493f));
    roof.position.set(0, 1.98 * scale, 1.55 * scale);
    group.add(roof);
  } else if (type === "galleon" || type === "rocketeer") {
    addSquareSail(group, -0.7, -1.8, 0.95, 0xf6ead0, 2);
    addSquareSail(group, 0.7, 0.15, 1.08, 0xf8df88, 3);
    addSquareSail(group, 0, 1.42, 0.82, 0xf6ead0, 2);
  } else if (type === "merchantman" || type === "eastindiaman") {
    addSquareSail(group, -0.8, -1.75, 0.92, 0xf3e5c8, 2);
    addSquareSail(group, 0.25, 0.15, 1.02, 0xf7edcf, 2);
    addSquareSail(group, 0.9, 1.35, 0.74, 0xf3e5c8, 1);
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 3, spec.color, profile);
  } else if (type === "shallop") {
    addSail(group, 0, -0.1, 0.72, 0xf6ead0);
    addOars(group, 3, hullSize[1], hullSize[0], scale, profile);
  } else if (type === "pinnace") {
    addSail(group, -0.22, -0.9, 0.72, 0xd9f8ff);
    addSail(group, 0.28, 0.75, 0.62, 0xf7f0df);
    addCabin(group, 0, 1.55, 1.35, 0.85, scale * 0.75, 0x76523d);
  } else if (type === "dart") {
    addSail(group, 0, 0, 0.75, 0xc8fbff);
    addCabin(group, 0, 1.75, 1.25, 0.78, scale * 0.72, 0x4d5f62);
  } else if (type === "modernschooner") {
    addSail(group, -0.36, -1.2, 0.82, 0xf8f8f2);
    addSail(group, 0.38, 0.85, 0.9, 0xf8f8f2);
    const accent = mat(0x2e8ed8);
    [-1, 1].forEach((side) => {
      addHullSideLine(
        group,
        hullSize[0],
        hullSize[1],
        scale,
        side,
        1.28 * scale,
        -hullSize[0] * 0.31 * scale,
        hullSize[0] * 0.28 * scale,
        accent,
        0.014,
        1.0,
        profile,
      );
      const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, 0.055 * scale, 2.35 * scale), accent);
      deckTrim.position.set(side * 0.72 * scale, 1.39 * scale, 0.15 * scale);
      deckTrim.castShadow = true;
      group.add(deckTrim);
    });
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.18 * scale, 0.46 * scale, 0.92 * scale), mat(0xf8fbff));
    cockpit.position.set(0, 1.52 * scale, 1.58 * scale);
    cockpit.castShadow = true;
    group.add(cockpit);
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.34 * scale, 0.09 * scale, 1.04 * scale), mat(0xffffff));
    cabinRoof.position.set(0, 1.8 * scale, 1.58 * scale);
    cabinRoof.castShadow = true;
    group.add(cabinRoof);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.86 * scale, 0.26 * scale, 0.08 * scale), mat(0x8edcff));
    glass.position.set(0, 1.64 * scale, 1.15 * scale);
    group.add(glass);
    const glassTrim = new THREE.Mesh(new THREE.BoxGeometry(1.0 * scale, 0.035 * scale, 0.1 * scale), accent);
    glassTrim.position.set(0, 1.82 * scale, 1.14 * scale);
    group.add(glassTrim);
    const chrome = mat(0xf8fbff);
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.18 * scale, 3.35 * scale), chrome);
      rail.position.set(side * 0.95 * scale, 1.42 * scale, -0.2 * scale);
      group.add(rail);
    });
    const sternRail = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 0.06 * scale, 0.055 * scale), chrome);
    sternRail.position.set(0, 1.52 * scale, 2.55 * scale);
    group.add(sternRail);
  } else if (type === "schooner" || type === "packet" || type === "chassemaree") {
    addSail(group, -0.35, -1.4, 0.82, 0xd8f5ff);
    addSail(group, 0.35, 0.9, type === "chassemaree" ? 0.92 : 1.08, type === "chassemaree" ? 0xf5edd8 : 0xbfefff);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.35 * scale, 0.48 * scale, 0.95 * scale), mat(0x9ee8ff));
    glass.position.set(0, 1.62 * scale, 1.75 * scale);
    group.add(glass);
    if (type === "packet") addSquareSail(group, -0.65, -2.0, 0.62, 0xf8efd8, 1);
    if (type === "chassemaree") {
      addDeckFittings(group, hullSize[0], hullSize[1], scale, 2, spec.color, profile);
      const cargoRack = new THREE.Mesh(new THREE.BoxGeometry(1.6 * scale, 0.26 * scale, 0.72 * scale), mats.plank);
      cargoRack.position.set(0, 1.53 * scale, -0.15 * scale);
      group.add(cargoRack);
    }
  } else if (type === "cat") {
    const outriggerA = hullMesh(5.7 * scale, 0.85 * scale, 0.65 * scale, mats.hull, "dart");
    const outriggerB = hullMesh(5.7 * scale, 0.85 * scale, 0.65 * scale, mats.hull, "dart");
    outriggerA.position.x = -2.2 * scale;
    outriggerB.position.x = 2.2 * scale;
    group.add(outriggerA, outriggerB);
    addSail(group, 0, -0.15, 0.95, 0xffe1d0);
  } else if (type === "dhow") {
    addSail(group, 0.25, -0.25, 1.18, 0xffefbe);
    const prow = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 14, Math.PI), mat(0xf0d05a));
    prow.position.set(0, 1.32 * scale, -hullSize[0] * 0.48 * scale);
    prow.rotation.x = Math.PI / 2;
    group.add(prow);
  } else if (type === "bombketch") {
    addSquareSail(group, -0.4, -1.4, 0.74, 0xe7dcc4, 1);
    addSail(group, 0.45, 1.0, 0.7, 0xf4ead8);
    const mortarBed = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * scale, 0.7 * scale, 0.36 * scale, 12), mat(0x3f3b35));
    mortarBed.position.set(0, 1.72 * scale, -0.15 * scale);
    group.add(mortarBed);
    const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 0.7 * scale, 12), mats.dark);
    mortar.rotation.x = -0.75;
    mortar.position.set(0, 2.0 * scale, -0.25 * scale);
    group.add(mortar);
    addCabin(group, 0, 2.05, 1.9, 1.2, scale * 0.9, 0x58463a);
  } else if (type === "turtle") {
    const roofMat = mat(0x365f43);
    roofMat.side = THREE.DoubleSide;
    const floorMat = mat(0x6f4a32);
    const plateMat = mat(0x284532);
    const trimMat = mat(0xb25a35);
    const beamMat = mat(0x4f3322);
    const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(4.85 * scale, 0.08 * scale, 6.8 * scale), floorMat);
    interiorFloor.position.set(0, 1.31 * scale, -0.02 * scale);
    interiorFloor.castShadow = true;
    interiorFloor.receiveShadow = true;
    group.add(interiorFloor);
    const centerRunner = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.09 * scale, 6.25 * scale), beamMat);
    centerRunner.position.set(0, 1.39 * scale, -0.02 * scale);
    centerRunner.castShadow = true;
    group.add(centerRunner);
    [-1, 1].forEach((side) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.16 * scale, 5.25 * scale), mat(0x5c3a24));
      bench.position.set(side * 1.42 * scale, 1.47 * scale, -0.1 * scale);
      bench.castShadow = true;
      group.add(bench);
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.18 * scale, 3.65 * scale), mat(0x2a2d25));
      rack.position.set(side * 1.88 * scale, 1.58 * scale, -0.1 * scale);
      rack.castShadow = true;
      group.add(rack);
    });
    for (let row = 0; row < 4; row++) {
      const z = (-2.45 + row * 1.62) * scale;
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.78 * scale, 0.16 * scale, 0.5 * scale), mat(row % 2 ? 0x6b4328 : 0x7a4c2b));
      table.position.set(0, 1.55 * scale, z);
      table.castShadow = true;
      group.add(table);
      [-1, 1].forEach((side) => {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.22 * scale, 8), mats.gold);
        lamp.position.set(side * 0.42 * scale, 1.75 * scale, z);
        lamp.castShadow = true;
        group.add(lamp);
      });
    }
    const hatchFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55 * scale, 0.18 * scale, 0.22 * scale), trimMat);
    hatchFrame.position.set(0, 2.54 * scale, 3.2 * scale);
    hatchFrame.castShadow = true;
    group.add(hatchFrame);
    [-1, 1].forEach((side) => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.9 * scale, 0.18 * scale), trimMat);
      jamb.position.set(side * 0.72 * scale, 2.07 * scale, 3.2 * scale);
      jamb.castShadow = true;
      group.add(jamb);
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.12 * scale, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), roofMat);
    shell.position.y = 1.27 * scale;
    shell.scale.set(1.08, 0.72, 1.82);
    shell.castShadow = true;
    group.add(shell);
    for (let row = 0; row < 7; row++) {
      const z = (-3.05 + row * 1.02) * scale;
      const arch = Math.sin((row / 6) * Math.PI);
      const rib = new THREE.Mesh(new THREE.BoxGeometry((4.2 - Math.abs(row - 3) * 0.08) * scale, 0.12 * scale, 0.18 * scale), plateMat);
      rib.position.set(0, (1.86 + arch * 0.46) * scale, z);
      rib.castShadow = true;
      group.add(rib);
    }
    for (let row = 0; row < 5; row++) {
      const z = (-2.45 + row * 1.18) * scale;
      const arch = Math.sin((row / 4) * Math.PI);
      const rowWidth = 3.05 - Math.abs(row - 2) * 0.24;
      for (let col = -1; col <= 1; col++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.46 * scale, 7), mats.dark);
        spike.position.set(col * rowWidth * 0.42 * scale, (2.35 + arch * 0.34) * scale, z);
        spike.castShadow = true;
        group.add(spike);
      }
    }
    addTurtleShipMasts(group, scale);
    const sideTrimZ = [-2.65, -1.55, -0.45, 0.65, 1.75, 2.55];
    [-1, 1].forEach((side) => {
      sideTrimZ.forEach((z) => {
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.06 * scale, 2.65 * scale, 7), mat(0x5b3b25));
        oar.rotation.z = Math.PI / 2;
        oar.position.set(side * 2.18 * scale, 1.0 * scale, z * scale);
        oar.castShadow = true;
        group.add(oar);
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.34 * scale, 5.55 * scale), trimMat);
      rail.position.set(side * 2.08 * scale, 1.45 * scale, -0.05 * scale);
      rail.castShadow = true;
      group.add(rail);
    });
    addTurtleGunModels(group, hullSize[0], hullSize[1], scale, profile);
    const bowZ = -hullSize[0] * 0.58 * scale;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.23 * scale, 0.32 * scale, 1.02 * scale, 10), trimMat);
    neck.rotation.x = -Math.PI / 2;
    neck.position.set(0, 1.55 * scale, bowZ + 0.28 * scale);
    neck.castShadow = true;
    group.add(neck);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.48 * scale, 0.95 * scale, 10), mat(0x7f3528));
    head.rotation.x = -Math.PI / 2;
    head.position.set(0, 1.58 * scale, bowZ - 0.42 * scale);
    head.castShadow = true;
    group.add(head);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.58 * scale, 0.18 * scale, 0.72 * scale), mat(0x52251e));
    jaw.position.set(0, 1.35 * scale, bowZ - 0.72 * scale);
    jaw.castShadow = true;
    group.add(jaw);
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 8, 6), mat(0xffd35c));
      eye.position.set(side * 0.25 * scale, 1.72 * scale, bowZ - 0.52 * scale);
      group.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.42 * scale, 6), mats.gold);
      horn.rotation.set(-0.68, 0, side * 0.35);
      horn.position.set(side * 0.2 * scale, 1.96 * scale, bowZ - 0.12 * scale);
      horn.castShadow = true;
      group.add(horn);
    });
    const sternHouse = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 0.62 * scale, 0.9 * scale), mat(0x67412b));
    sternHouse.position.set(0, 1.68 * scale, 2.15 * scale);
    sternHouse.castShadow = true;
    group.add(sternHouse);
    const sternRoof = new THREE.Mesh(new THREE.BoxGeometry(1.58 * scale, 0.2 * scale, 1.08 * scale), plateMat);
    sternRoof.position.set(0, 2.08 * scale, 2.15 * scale);
    sternRoof.castShadow = true;
    group.add(sternRoof);
  } else if (type === "sloop") {
    addSail(group, -0.05, -0.9, 1.08, 0xd8f8ff);
    addSail(group, 0.35, 0.92, 0.68, 0xf8f4e5);
    addCabin(group, 0, 1.9, 1.35, 0.85, scale * 0.82, 0x624534);
  } else if (type === "storm") {
    addSail(group, -0.15, -1.05, 1.05, 0xc8cdfd);
    addSail(group, 0.2, 0.88, 0.82, 0xf4f4ff);
    addCabin(group, 0, 1.9, 1.45, 0.9, scale * 0.82, 0x4f4c65);
  } else if (type === "cog" || type === "hoy") {
    addSquareSail(group, 0, -0.2, 0.92, 0xf1e5c4, 1);
    addCabin(group, 0, 1.45, 1.8, 0.82, scale * 0.78, 0x7a5030);
    const highStern = new THREE.Mesh(new THREE.BoxGeometry(2.3 * scale, 0.85 * scale, 0.9 * scale), mat(0x7a5030));
    highStern.position.set(0, 1.66 * scale, 2.72 * scale);
    group.add(highStern);
  } else if (type === "longship") {
    addSquareSail(group, 0, -0.15, 0.78, 0xf4d2b8, 1);
    const dragon = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 1.1 * scale, 8), mat(0xd8b24a));
    dragon.rotation.x = Math.PI / 2.25;
    dragon.position.set(0, 1.54 * scale, -4.08 * scale);
    group.add(dragon);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.34 * scale, 0.055 * scale, 8, 16, Math.PI), mats.hullDark);
    tail.position.set(0, 1.46 * scale, 3.76 * scale);
    tail.rotation.x = -Math.PI / 2;
    group.add(tail);
  } else if (type === "knarr") {
    addSquareSail(group, 0, -0.25, 0.86, 0xead7a8, 1);
    addCabin(group, 0, 1.85, 1.7, 1.0, scale * 0.8, 0x8b5a32);
    addDeckFittings(group, hullSize[0], hullSize[1], scale, 2, spec.color, profile);
  } else if (type === "lugger" || type === "dogger") {
    addSail(group, -0.25, -1.2, 0.82, 0xe9f0dc);
    addSail(group, 0.35, 1.05, 0.78, 0xdfe8cf);
    const net = new THREE.Mesh(new THREE.TorusGeometry(0.42 * scale, 0.035 * scale, 8, 18), mats.rope);
    net.rotation.x = Math.PI / 2;
    net.position.set(-0.72 * scale, 1.6 * scale, 0.7 * scale);
    group.add(net);
  } else if (type === "polacre") {
    addSquareSail(group, -0.6, -1.6, 0.78, 0xffead6, 1);
    addSquareSail(group, 0.05, 0.0, 0.92, 0xfff4df, 2);
    addSail(group, 0.72, 1.48, 0.72, 0xffead6);
    addCabin(group, 0, 1.9, 1.9, 1.0, scale * 0.86, 0x7c4f35);
  } else if (type === "xebec" || type === "tartane") {
    addSail(group, -0.65, -1.65, 0.88, 0xffead6);
    addSail(group, 0.15, 0.05, 1.08, 0xfff4df);
    if (type === "xebec") addSail(group, 0.75, 1.75, 0.78, 0xffead6);
    addOars(group, type === "xebec" ? 5 : 3, hullSize[1], hullSize[0], scale, profile);
  } else if (type === "galley") {
    addSail(group, -0.2, -0.65, 1.0, 0xf8e8bc);
    addOars(group, 9, hullSize[1], hullSize[0], scale, profile);
    const ram = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 1.6 * scale, 6), mats.gold);
    ram.rotation.x = Math.PI / 2;
    ram.position.set(0, 0.75 * scale, -4.35 * scale);
    group.add(ram);
  } else if (type === "caravel" || type === "pink" || type === "ketch") {
    addSquareSail(group, -0.45, -1.2, 0.85, 0xf5ead3, 1);
    addSail(group, 0.45, 0.8, 0.95, 0xf8efd8);
    if (type === "ketch") addSail(group, 0.9, 1.34, 0.62, 0xf5ead3);
    addCabin(group, 0, 2.05, 2.0, 1.15, scale * 0.9, 0x77513a);
  } else if (type === "snow" || type === "barque" || type === "barquentine") {
    addSquareSail(group, -0.45, -1.35, 0.9, 0xf4f0dd, 2);
    if (type === "barquentine") addSail(group, 0.45, 0.8, 0.86, 0xe4edf7);
    else addSquareSail(group, 0.45, 0.8, 0.84, 0xe4edf7, 2);
    addSail(group, 0.75, 1.35, 0.62, 0xf4f0dd);
  } else if (type === "fluyt") {
    addSquareSail(group, -0.55, -1.35, 0.85, 0xf3e2c4, 2);
    addSquareSail(group, 0.35, 0.65, 0.95, 0xf7ead2, 2);
    addCabin(group, 0, 2.25, 2.45, 1.55, scale, 0x7a5030);
    const cargoHouse = hullMesh(2.0 * scale, 2.1 * scale, 0.35 * scale, mats.plank, "fluyt");
    cargoHouse.position.y = 1.55 * scale;
    group.add(cargoHouse);
  } else if (type === "frigate" || type === "corvette" || type === "razee" || type === "sixthrate" || type === "postship") {
    const navyScale = type === "postship" ? 0.94 : type === "sixthrate" ? 0.88 : 1;
    addSquareSail(group, -0.8, -1.8, 0.9 * navyScale, 0xf2ead5, type === "corvette" || type === "sixthrate" ? 2 : 3);
    addSquareSail(group, 0, 0, 1.02 * navyScale, 0xf8efd8, type === "postship" || type === "frigate" || type === "razee" ? 3 : 2);
    addSquareSail(group, 0.78, 1.28, type === "corvette" || type === "sixthrate" ? 0.68 : 0.78, 0xf2ead5, type === "corvette" || type === "sixthrate" ? 1 : 2);
  } else if (type === "whaler") {
    addSquareSail(group, -0.65, -1.55, 0.78, 0xe8eadf, 1);
    addSail(group, 0.45, 0.8, 0.86, 0xf4efd9);
    addWhalerCabinInterior(group, scale);
    const tryworks = new THREE.Mesh(new THREE.BoxGeometry(1.1 * scale, 0.42 * scale, 0.8 * scale), mat(0x394047));
    tryworks.position.set(-0.55 * scale, 1.72 * scale, -0.1 * scale);
    group.add(tryworks);
    const boat = hullMesh(1.75 * scale, 0.42 * scale, 0.25 * scale, mats.plank, "dart");
    boat.position.set(1.0 * scale, 1.82 * scale, 0.35 * scale);
    boat.rotation.z = 0.12;
    group.add(boat);
    const harpoonRack = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 1.7 * scale), mats.dark);
    harpoonRack.position.set(-1.1 * scale, 1.82 * scale, -1.1 * scale);
    harpoonRack.rotation.y = 0.35;
    group.add(harpoonRack);
    addWhalerNetRig(group, -1, scale);
    addWhalerNetRig(group, 1, scale);
  } else if (type === "ballooner") {
    addSquareSail(group, -0.62, -1.5, 0.78, 0xf2ead5, 1);
    addSail(group, 0.28, 0.45, 0.84, 0xf8efd8);
    addCabin(group, 0, 1.55, 1.75, 0.92, scale * 0.84, 0x7a5030);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.35 * scale, 0.16 * scale, 2.55 * scale), mats.plank);
    platform.position.set(0, 1.74 * scale, hullSize[0] * 0.36 * scale);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18 * scale, 0.045 * scale, 8, 28), mat(0xf3d178));
    ring.position.set(0, 1.86 * scale, hullSize[0] * 0.36 * scale);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.48 * scale, 2.65 * scale), mats.wood);
      rail.position.set(side * 1.72 * scale, 2.02 * scale, hullSize[0] * 0.36 * scale);
      group.add(rail);
    }
  } else if (type === "carrack") {
    addSquareSail(group, -0.55, -1.6, 0.95, 0xf6ead0, 2);
    addSquareSail(group, 0.55, 0.25, 1.04, 0xf8e7bb, 2);
    addSail(group, 0, 1.32, 0.86, 0xf6ead0);
  } else if (type === "fourthrate") {
    const sailBoost = 0.96;
    addSquareSail(group, -0.9, -2.1, 1.0 * sailBoost, 0xf6ead0, type === "fourthrate" ? 2 : 3);
    addSquareSail(group, 0, -0.1, 1.08 * sailBoost, 0xf8e7bb, 3);
    addSquareSail(group, 0.9, 1.42, 0.95 * sailBoost, 0xf6ead0, 2);
  } else if (type === "manowar" || type === "firstrate" || type === "manofwar") {
    const sailBoost = type === "manofwar" ? 1.28 : type === "firstrate" ? 1.18 : 1.1;
    addSquareSail(group, -1.0, -3.18, 1.06 * sailBoost, 0xf6ead0, 3);
    addSquareSail(group, -0.34, -1.28, 1.16 * sailBoost, 0xf8e7bb, 3);
    addSquareSail(group, 0.36, 1.08, 1.08 * sailBoost, 0xf6ead0, 3);
    addSquareSail(group, 0.95, 3.08, 0.9 * sailBoost, 0xf6ead0, type === "manofwar" ? 3 : type === "firstrate" ? 2 : 1);
    if (type === "manofwar") {
      [-1, 1].forEach((side) => {
        const goldSide = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.2 * scale, 7.2 * scale), mats.gold);
        goldSide.position.set(side * 2.0 * scale, 1.48 * scale, -0.05 * scale);
        goldSide.castShadow = true;
        group.add(goldSide);
      });
    }
  } else if (type === "treasure" || type === "treasureship") {
    const treasureSailScale = type === "treasureship" ? 1.08 : 1;
    addSquareSail(group, -1.05, -4.75, 1.2 * treasureSailScale, 0xf5df9b, 3);
    addSquareSail(group, -0.62, -2.88, 1.32 * treasureSailScale, 0xf8e8aa, 3);
    addSquareSail(group, -0.18, -0.98, 1.42 * treasureSailScale, 0xf1d98d, 3);
    addSquareSail(group, 0.28, 1.08, 1.34 * treasureSailScale, 0xf8e8aa, 3);
    addSquareSail(group, 0.7, 3.08, 1.2 * treasureSailScale, 0xf5df9b, 3);
    addSquareSail(group, 1.02, 4.58, 1.02 * treasureSailScale, 0xf1d98d, 2);
    const pagodaZ = hullSize[0] * 0.37 * scale;
    const pagodaSize = type === "treasureship" ? 1.18 : 1;
    const pagodaBase = new THREE.Mesh(new THREE.BoxGeometry(2.0 * scale * pagodaSize, 0.72 * scale * pagodaSize, 1.28 * scale * pagodaSize), mat(0x7e3d2a));
    pagodaBase.position.set(0, 2.48 * scale, pagodaZ);
    pagodaBase.castShadow = true;
    group.add(pagodaBase);
    const pagodaRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5 * scale * pagodaSize, 0.45 * scale * pagodaSize, 4), mat(0xd6a83c));
    pagodaRoof.position.set(0, (3.05 + (pagodaSize - 1) * 0.25) * scale, pagodaZ);
    pagodaRoof.rotation.y = Math.PI / 4;
    pagodaRoof.castShadow = true;
    group.add(pagodaRoof);
    const pagodaUpper = new THREE.Mesh(new THREE.BoxGeometry(1.26 * scale * pagodaSize, 0.54 * scale * pagodaSize, 0.86 * scale * pagodaSize), mat(0x9f3428));
    pagodaUpper.position.set(0, (3.34 + (pagodaSize - 1) * 0.38) * scale, pagodaZ);
    pagodaUpper.castShadow = true;
    group.add(pagodaUpper);
    const pagodaTop = new THREE.Mesh(new THREE.ConeGeometry(1.05 * scale * pagodaSize, 0.38 * scale * pagodaSize, 4), mat(0xd6a83c));
    pagodaTop.position.set(0, (3.78 + (pagodaSize - 1) * 0.5) * scale, pagodaZ);
    pagodaTop.rotation.y = Math.PI / 4;
    group.add(pagodaTop);
  } else if (type === "ironclad") {
    const armorDeck = hullMesh(5.8 * scale, 3.0 * scale, 0.28 * scale, mat(0x4f555b), "ironclad");
    armorDeck.position.y = 1.28 * scale;
    group.add(armorDeck);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * scale, 0.78 * scale, 0.48 * scale, 14), mat(0x30363b));
    turret.position.set(0, 1.78 * scale, -0.35 * scale);
    group.add(turret);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.14 * scale, 1.8 * scale, 10), mats.dark);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 1.78 * scale, -1.45 * scale);
    group.add(gun);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.28 * scale, 1.25 * scale, 10), mats.dark);
    stack.position.set(0.72 * scale, 2.12 * scale, 1.0 * scale);
    group.add(stack);
  } else {
    addSail(group, 0, 0.2, 0.86);
  }
  addHistoricalDetails(group, type, hullSize[0], hullSize[1], scale, spec, profile);
  addShipNightLights(group, hullSize[0], hullSize[1], scale, shipTier(type), profile);
  const visual = new THREE.Group();
  while (group.children.length) visual.add(group.children[0]);
  visual.rotation.y = Math.PI;
  group.add(visual);
  group.traverse((obj) => {
    obj.castShadow = obj.castShadow || obj.isMesh;
    obj.receiveShadow = obj.receiveShadow || obj.isMesh;
  });
  if (remote) group.scale.setScalar(0.86);
  return group;
}

function makeCharacter() {
  const group = new THREE.Group();
  const skin = mat(0xc88b58);
  const cloth = mat(0x2c5f80);
  const trouser = mat(0x27364a);
  const boot = mat(0x241a16);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.9, 0.34), cloth);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 9), skin);
  head.position.y = 1.94;
  head.castShadow = true;
  group.add(head);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.08, 12), mats.dark);
  hatBrim.position.y = 2.18;
  hatBrim.castShadow = true;
  group.add(hatBrim);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.34, 8), mat(0xd9a028));
  hat.position.y = 2.4;
  hat.castShadow = true;
  group.add(hat);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), cloth);
    arm.position.set(side * 0.43, 1.25, 0.02);
    arm.rotation.z = side * 0.12;
    arm.castShadow = true;
    group.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), skin);
    hand.position.set(side * 0.46, 0.86, 0.03);
    group.add(hand);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.18), trouser);
    leg.position.set(side * 0.16, 0.48, 0);
    leg.castShadow = true;
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.36), boot);
    foot.position.set(side * 0.16, 0.06, 0.06);
    foot.castShadow = true;
    group.add(foot);
  }
  group.scale.setScalar(CHARACTER_SCALE);
  group.visible = false;
  scene.add(group);
  return group;
}

function markSharedProjectileAsset(asset) {
  if (asset?.userData) asset.userData.sharedProjectileAsset = true;
  return asset;
}

function sharedProjectileMaterial(key, factory) {
  let material = projectileSharedAssets.materials.get(key);
  if (!material) {
    material = markSharedProjectileAsset(factory());
    projectileSharedAssets.materials.set(key, material);
  }
  return material;
}

function sharedSphereProjectileGeometry(radius) {
  const key = radius.toFixed(3);
  let geometry = projectileSharedAssets.sphereGeometries.get(key);
  if (!geometry) {
    geometry = markSharedProjectileAsset(new THREE.SphereGeometry(radius, 10, 8));
    projectileSharedAssets.sphereGeometries.set(key, geometry);
  }
  return geometry;
}

function sharedRocketAssets() {
  if (!projectileSharedAssets.rocket) {
    projectileSharedAssets.rocket = {
      bodyGeometry: markSharedProjectileAsset(new THREE.CylinderGeometry(0.075, 0.1, 0.58, 10)),
      bodyMaterial: sharedProjectileMaterial("rocket-body", () => new THREE.MeshStandardMaterial({ color: 0x8b2f25, roughness: 0.72, metalness: 0.08 })),
      noseGeometry: markSharedProjectileAsset(new THREE.ConeGeometry(0.12, 0.22, 10)),
      noseMaterial: sharedProjectileMaterial("rocket-nose", () => mat(0xf2c85d)),
      nozzleGeometry: markSharedProjectileAsset(new THREE.ConeGeometry(0.11, 0.24, 10)),
      nozzleMaterial: sharedProjectileMaterial("rocket-nozzle", () => new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.86 })),
    };
  }
  return projectileSharedAssets.rocket;
}

function makeProjectileMesh(ammo, shotDir) {
  if (ammo.id === "rocketburst") {
    const assets = sharedRocketAssets();
    const mesh = new THREE.Mesh(assets.bodyGeometry, assets.bodyMaterial);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shotDir);
    const nose = new THREE.Mesh(assets.noseGeometry, assets.noseMaterial);
    nose.position.y = 0.39;
    mesh.add(nose);
    const nozzle = new THREE.Mesh(assets.nozzleGeometry, assets.nozzleMaterial);
    nozzle.position.y = -0.4;
    nozzle.rotation.x = Math.PI;
    mesh.add(nozzle);
    return mesh;
  }
  const radius = ammo.radius || 0.35;
  const color = ammo.color || 0x2f3342;
  return new THREE.Mesh(
    sharedSphereProjectileGeometry(radius),
    sharedProjectileMaterial(`shot-${radius.toFixed(3)}-${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.04 }))
  );
}

function sharedSparkGeometry() {
  if (!projectileSharedAssets.sparkGeometry) {
    projectileSharedAssets.sparkGeometry = markSharedProjectileAsset(new THREE.SphereGeometry(1, 6, 4));
  }
  return projectileSharedAssets.sparkGeometry;
}

function sharedSparkMaterial(color) {
  let material = projectileSharedAssets.sparkMaterials.get(color);
  if (!material) {
    material = markSharedProjectileAsset(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    projectileSharedAssets.sparkMaterials.set(color, material);
  }
  return material;
}

function disposeMaybeShared(resource) {
  if (!resource?.dispose || resource.userData?.sharedProjectileAsset) return;
  resource.dispose();
}

function makeProjectile(owner, pos, dir, damage, range, options = {}) {
  const ammo = CANNONBALL_TYPES[options.ammoType] || CANNONBALL_TYPES.basic;
  const shotDir = dir.clone().normalize();
  const target = options.target
    ? options.target.clone()
    : pos.clone().add(shotDir.clone().multiplyScalar(range));
  target.y = ammo.airburst ? 24 : 0;
  const start = pos.clone();
  start.y = Number.isFinite(Number(options.startY)) ? Number(options.startY) : 1.15;
  const distance = Math.max(1, ammo.airburst ? start.distanceTo(target) : dist2(start, target));
  const ballistic = Boolean(options.ballistic) && !ammo.airburst;
  const gravity = Number(options.gravity) || CANNONBALL_GRAVITY;
  const shotSpeed = CANNONBALL_SPEED * (Number(ammo.speedScale) || 1);
  const flightTime = Math.max(0.1, distance / shotSpeed);
  const verticalVelocity = Number.isFinite(Number(options.verticalVelocity))
    ? Number(options.verticalVelocity)
    : ballistic
      ? (0.5 * gravity * flightTime * flightTime - Math.max(0.35, start.y)) / flightTime
      : 0;
  const createdWallAt = Number.isFinite(Number(options.createdWallAt)) ? Number(options.createdWallAt) : Date.now();
  const replayAge = Math.max(0, (Date.now() - createdWallAt) / 1000);
  const initialAge = clamp(Number.isFinite(Number(options.initialAge)) ? Number(options.initialAge) : replayAge, 0, Math.max(0, flightTime - 0.02));
  const initialTraveled = clamp(Number.isFinite(Number(options.initialTraveled)) ? Number(options.initialTraveled) : initialAge * shotSpeed, 0, distance);
  const arcHeight = ammo.airburst ? 0 : clamp(distance * 0.16, 3.2, 10.5);
  const mesh = makeProjectileMesh(ammo, shotDir);
  mesh.position.copy(start);
  if (initialTraveled > 0.001) {
    const initialProgress = clamp(initialTraveled / distance, 0, 1);
    if (ballistic) {
      mesh.position.copy(start).addScaledVector(shotDir, initialTraveled);
      const traveledTime = initialTraveled / Math.max(0.001, shotSpeed);
      mesh.position.y = start.y + verticalVelocity * traveledTime - 0.5 * gravity * traveledTime * traveledTime;
    } else {
      mesh.position.lerpVectors(start, target, initialProgress);
    }
    if (!ammo.airburst && !ballistic) {
      mesh.position.y = 1.05 + Math.sin(initialProgress * Math.PI) * arcHeight + Math.sin(clock.elapsedTime * 16) * 0.08;
    } else if (ammo.airburst) {
      mesh.position.y += Math.sin(initialProgress * Math.PI) * 1.8;
    }
  }
  const remote = Boolean(options.remote);
  mesh.castShadow = !remote;
  scene.add(mesh);
  playSound("cannon", start, remote ? 0.68 : 1);
  const trailPositions = new Float32Array(7 * 3);
  for (let i = 0; i < 7; i++) {
    trailPositions[i * 3] = mesh.position.x;
    trailPositions[i * 3 + 1] = mesh.position.y;
    trailPositions[i * 3 + 2] = mesh.position.z;
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setDrawRange(0, 1);
  const trail = new THREE.Line(
    trailGeometry,
    new THREE.LineBasicMaterial({ color: ammo.trail || 0xd9fbff, transparent: true, opacity: 0.62 })
  );
  scene.add(trail);
  const projectile = {
    owner,
    mesh,
    trail,
    trailPositions,
    trailPointCount: 1,
    start,
    target,
    dir: shotDir,
    speed: shotSpeed,
    traveled: initialTraveled,
    distance,
    damage,
    baseDamage: Number(options.baseDamage) || damage,
    rangeDamage: Boolean(options.rangeDamage),
    targetKind: options.targetKind || "any",
    remote,
    serverId: options.serverId || null,
    serverAuthoritative: Boolean(options.serverAuthoritative),
    ammoType: ammo.id,
    airburst: Boolean(ammo.airburst),
    ballistic,
    gravity,
    verticalVelocity,
    fire: ammo.fire ? { ...ammo.fire } : null,
    arcHeight,
    createdWallAt,
    maxWallAge: Math.max(2200, (distance / shotSpeed + 1.2) * 1000),
  };
  projectiles.push(projectile);
  return projectile;
}

function projectileDamageAtImpact(shot) {
  const base = Number(shot?.baseDamage ?? shot?.damage) || 0;
  if (!shot?.rangeDamage) return Number(shot?.damage) || base;
  return scaleDamageByRange(base, Math.min(Number(shot.traveled) || 0, Number(shot.distance) || 1), Number(shot.distance) || 1);
}

function removeProjectile(shot, impact = "none") {
  if (!shot) return;
  if (impact === "hit") {
    if (shot.fire) makeFireImpactEffect(shot.mesh.position.clone(), shot.dir);
    else makeSplinterEffect(shot.mesh.position.clone(), shot.dir);
  }
  if (impact === "splash") makeSplashEffect(shot.target);
  scene.remove(shot.mesh, shot.trail);
  shot.mesh.traverse?.((child) => {
    if (child.geometry) disposeMaybeShared(child.geometry);
    if (Array.isArray(child.material)) child.material.forEach(disposeMaybeShared);
    else if (child.material) disposeMaybeShared(child.material);
  });
  shot.trail.geometry.dispose();
  shot.trail.material.dispose();
  const index = projectiles.indexOf(shot);
  if (index >= 0) projectiles.splice(index, 1);
}

function addImpactEffect(group, life = 0.7, options = {}) {
  const initialAge = Math.max(0, Number(options.initialAge) || 0);
  const now = Date.now();
  scene.add(group);
  impactEffects.push({
    group,
    life,
    age: Math.min(initialAge, life),
    bornWall: now - initialAge * 1000,
    maxWallAge: Math.max(Number(options.maxWallAge) || 0, life * 1000 + 250),
  });
}

function makeSplashEffect(position) {
  const group = new THREE.Group();
  group.position.set(position.x, 0.08, position.z);
  playSound("splash", position);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.78, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.userData.baseScale = 1;
  group.add(ring);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.25;
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.11 + Math.random() * 0.07, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xf1fdff, transparent: true, opacity: 0.88 })
    );
    drop.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.25);
    drop.userData.velocity = new THREE.Vector3(Math.cos(angle) * (2.2 + Math.random()), 3.2 + Math.random() * 1.4, Math.sin(angle) * (2.2 + Math.random()));
    group.add(drop);
  }
  addImpactEffect(group, 0.68);
}

function addWaveHazard(position, options = {}) {
  const delay = Math.max(0, Number(options.delay) || 0);
  const life = options.life || 1.6;
  waveHazards.push({
    position: position.clone().setY(0),
    born: clock.elapsedTime + delay,
    bornWall: Date.now() + delay * 1000,
    life,
    radiusStart: options.radiusStart || 5,
    radiusEnd: options.radiusEnd || 24,
    thickness: options.thickness || 3,
    dps: Number.isFinite(Number(options.dps)) ? Number(options.dps) : 10,
    force: options.force || 18,
    damageShips: options.damageShips !== false,
    source: options.source || null,
  });
}

function updateWaveHazards(dt) {
  const nowWall = Date.now();
  waveHazards.slice().forEach((hazard) => {
    const clockAge = clock.elapsedTime - hazard.born;
    const wallAge = Number.isFinite(hazard.bornWall) ? (nowWall - hazard.bornWall) / 1000 : clockAge;
    const age = Math.max(clockAge, wallAge);
    if (age < 0) return;
    const t = clamp(age / hazard.life, 0, 1);
    const radius = hazard.radiusStart + (hazard.radiusEnd - hazard.radiusStart) * t;
    const applyTo = (target, position, velocity, type) => {
      const d = dist2(position, hazard.position);
      if (Math.abs(d - radius) > hazard.thickness + shipHitRadius(type) * 0.35) return;
      const away = position.clone().sub(hazard.position);
      away.y = 0;
      if (away.lengthSq() < 0.001) away.set(1, 0, 0);
      away.normalize();
      if (hazard.damageShips) {
        const amount = hazard.source === "bomb" ? bombDamageForShip(type, hazard.dps * dt) : hazard.dps * dt;
        damageTarget(target, amount);
      }
      if (velocity) velocity.add(away.multiplyScalar(hazard.force * dt));
    };
    if (firstPersonCharacterActive() && state.mode !== "land") {
      const d = dist2(character.position, hazard.position);
      if (Math.abs(d - radius) <= hazard.thickness + 0.5 && hazard.damageShips) {
        damageCharacter(CHARACTER_MAX_HP, { message: "You were knocked out and respawned on deck." });
      }
    } else if (state.mode === "ship") applyTo(state, playerShip.position, state.velocity, state.shipType);
    bots.forEach((bot) => applyTo(bot, bot.group.position, bot.velocity, bot.shipType));
    if (age > hazard.life || (Number.isFinite(hazard.bornWall) && nowWall - hazard.bornWall > hazard.life * 1000 + 300)) waveHazards.splice(waveHazards.indexOf(hazard), 1);
  });
}

function makeSplinterEffect(position, dir) {
  const group = new THREE.Group();
  group.position.copy(position);
  playSound("splinter", position);
  const forward = dir.clone().normalize();
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  for (let i = 0; i < 13; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.08 + Math.random() * 0.08, 0.08 + Math.random() * 0.08, 0.55 + Math.random() * 0.55),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xd6a45d : 0x8b5a32, transparent: true, opacity: 0.95 })
    );
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const spread = forward.clone().multiplyScalar(1.2 + Math.random() * 2.0)
      .add(side.clone().multiplyScalar((Math.random() - 0.5) * 4.2))
      .add(new THREE.Vector3(0, 1.1 + Math.random() * 2.4, 0));
    shard.userData.velocity = spread;
    shard.userData.spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    group.add(shard);
  }
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xf2dfb7, transparent: true, opacity: 0.5 })
  );
  puff.userData.puff = true;
  group.add(puff);
  addImpactEffect(group, 0.78);
}

function makeFireImpactEffect(position, dir) {
  const group = new THREE.Group();
  group.position.copy(position);
  playSound("fire", position);
  const forward = dir.clone().normalize();
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.92, 28),
    new THREE.MeshBasicMaterial({ color: 0xff3d1f, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);
  for (let i = 0; i < 18; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 7, 5),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfff0a6 : i % 2 === 0 ? 0xff8b28 : 0xd61f15,
        transparent: true,
        opacity: 0.95,
      })
    );
    const spread = forward.clone().multiplyScalar(0.8 + Math.random() * 1.6)
      .add(side.clone().multiplyScalar((Math.random() - 0.5) * 3.4))
      .add(new THREE.Vector3(0, 1.3 + Math.random() * 2.1, 0));
    spark.userData.velocity = spread;
    spark.userData.spin = new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7);
    group.add(spark);
  }
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4b1f, transparent: true, opacity: 0.58 })
  );
  flash.userData.puff = true;
  group.add(flash);
  addImpactEffect(group, 0.72);
}

function makeLeviathanSkullGeometry() {
  const sections = [
    { z: -2.6, w: 2.75, top: 3.45, mid: 2.55, bottom: 1.28 },
    { z: -4.5, w: 3.35, top: 4.0, mid: 2.7, bottom: 1.05 },
    { z: -6.5, w: 2.72, top: 3.72, mid: 2.42, bottom: 0.9 },
    { z: -8.7, w: 1.68, top: 3.1, mid: 2.04, bottom: 0.78 },
    { z: -10.9, w: 0.72, top: 2.48, mid: 1.68, bottom: 0.68 },
  ];
  const vertices = [];
  const indices = [];
  sections.forEach((section) => {
    const { z, w, top, mid, bottom } = section;
    vertices.push(
      0, top, z,
      w * 0.56, top - 0.34, z,
      w, mid, z,
      w * 0.62, bottom + 0.2, z,
      0, bottom, z,
      -w * 0.62, bottom + 0.2, z,
      -w, mid, z,
      -w * 0.56, top - 0.34, z,
    );
  });
  const ringSize = 8;
  for (let i = 0; i < sections.length - 1; i++) {
    const ring = i * ringSize;
    const nextRing = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const next = (j + 1) % ringSize;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  const backCenter = vertices.length / 3;
  vertices.push(0, 2.45, sections[0].z);
  for (let j = 0; j < ringSize; j++) indices.push(backCenter, j, (j + 1) % ringSize);
  const frontCenter = vertices.length / 3;
  const frontRing = (sections.length - 1) * ringSize;
  const lastSection = sections[sections.length - 1];
  vertices.push(0, lastSection.mid, lastSection.z);
  for (let j = 0; j < ringSize; j++) indices.push(frontCenter, frontRing + ((j + 1) % ringSize), frontRing + j);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeLeviathanJawGeometry(upper = true) {
  const sections = [
    { z: 0.9, w: 1.86, h: upper ? 0.36 : 0.3 },
    { z: -1.35, w: 1.52, h: upper ? 0.3 : 0.26 },
    { z: -3.75, w: 0.88, h: upper ? 0.24 : 0.2 },
    { z: -5.05, w: 0.3, h: upper ? 0.16 : 0.14 },
  ];
  const vertices = [];
  const indices = [];
  sections.forEach(({ z, w, h }) => {
    vertices.push(
      0, h, z,
      w, h * 0.28, z,
      w * 0.82, -h, z,
      0, -h * 1.12, z,
      -w * 0.82, -h, z,
      -w, h * 0.28, z,
    );
  });
  const ringSize = 6;
  for (let i = 0; i < sections.length - 1; i++) {
    const ring = i * ringSize;
    const nextRing = (i + 1) * ringSize;
    for (let j = 0; j < ringSize; j++) {
      const next = (j + 1) % ringSize;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeLeviathanMesh() {
  const group = new THREE.Group();
  const hide = mat(0x6d4d4a, 0.92);
  const darkHide = mat(0x3e2e31, 0.96);
  const bellyMat = mat(0x8a6860, 0.92);
  const reptileHide = new THREE.MeshStandardMaterial({ color: 0x6d4d4a, roughness: 0.96, metalness: 0.03, flatShading: true });
  const reptileDark = new THREE.MeshStandardMaterial({ color: 0x3e2e31, roughness: 0.98, metalness: 0.02, flatShading: true });
  const toothMat = mat(0xf0e2c6, 0.76);
  const scarMat = new THREE.MeshStandardMaterial({ color: 0x4c3030, roughness: 0.82, metalness: 0.02 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffa126, emissive: 0xff6b00, emissiveIntensity: 1.85, roughness: 0.45, metalness: 0 });
  const bodyPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -4.0, 6.8),
    new THREE.Vector3(-0.4, -4.7, 15.5),
    new THREE.Vector3(0.55, -5.7, 26.5),
    new THREE.Vector3(-0.35, -7.1, 39.5),
    new THREE.Vector3(0.1, -8.5, 51.0),
  ], false, "catmullrom", 0.38);
  const body = new THREE.Mesh(makeTaperedTubeGeometry(bodyPath, 4.35, 1.35, {
    segments: 54,
    radialSegments: 18,
    oval: 0.92,
  }), hide);
  body.castShadow = true;
  group.add(body);
  const shoulderMass = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), hide);
  shoulderMass.scale.set(3.85, 1.35, 4.9);
  shoulderMass.position.set(0, -4.15, 8.2);
  shoulderMass.castShadow = true;
  group.add(shoulderMass);
  const backRidgePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -1.2, 7.7),
    new THREE.Vector3(-0.35, -1.85, 17.8),
    new THREE.Vector3(0.38, -2.8, 29.8),
    new THREE.Vector3(-0.25, -4.2, 43.5),
  ], false, "catmullrom", 0.34);
  const backRidge = new THREE.Mesh(makeTaperedTubeGeometry(backRidgePath, 1.25, 0.42, {
    segments: 38,
    radialSegments: 10,
    oval: 0.5,
  }), reptileDark);
  backRidge.castShadow = true;
  group.add(backRidge);
  const bellyPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -5.15, 7.0),
    new THREE.Vector3(-0.35, -6.05, 16.6),
    new THREE.Vector3(0.48, -7.3, 28.2),
    new THREE.Vector3(-0.18, -8.75, 42.5),
  ], false, "catmullrom", 0.38);
  const bodyBelly = new THREE.Mesh(makeTaperedTubeGeometry(bellyPath, 1.45, 0.42, {
    segments: 36,
    radialSegments: 10,
    oval: 0.5,
  }), bellyMat);
  bodyBelly.castShadow = true;
  group.add(bodyBelly);
  const neckPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, -5.0, 7.8),
    new THREE.Vector3(0.7, -2.9, 4.2),
    new THREE.Vector3(-0.55, -0.4, 0.2),
    new THREE.Vector3(0.15, 1.65, -3.15),
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckPath, 42, 2.15, 18, false), hide);
  neck.scale.set(0.78, 1.0, 1.08);
  neck.castShadow = true;
  group.add(neck);
  const throat = new THREE.Mesh(new THREE.TubeGeometry(neckPath, 42, 1.04, 12, false), bellyMat);
  throat.position.y = -0.58;
  throat.position.z = -0.32;
  throat.scale.set(0.35, 0.34, 0.95);
  group.add(throat);

  const head = new THREE.Mesh(makeLeviathanSkullGeometry(), reptileHide);
  head.scale.set(1.12, 1.04, 1.02);
  head.castShadow = true;
  group.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.34, 0.95), reptileDark);
  brow.position.set(0, 3.48, -7.14);
  brow.rotation.x = -0.12;
  brow.castShadow = true;
  group.add(brow);

  const snoutRidge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 5.4), reptileDark);
  snoutRidge.position.set(0, 3.0, -8.15);
  snoutRidge.rotation.x = -0.1;
  snoutRidge.castShadow = true;
  group.add(snoutRidge);

  const upperJaw = new THREE.Mesh(makeLeviathanJawGeometry(true), reptileDark);
  upperJaw.position.set(0, 1.72, -6.65);
  upperJaw.rotation.x = 0.04;
  upperJaw.scale.set(1.18, 1.0, 1.0);
  upperJaw.userData.leviathanUpperJaw = true;
  upperJaw.userData.baseRotationX = upperJaw.rotation.x;
  upperJaw.castShadow = true;
  group.add(upperJaw);
  const lowerJaw = new THREE.Mesh(makeLeviathanJawGeometry(false), bellyMat);
  lowerJaw.position.set(0, 0.82, -6.4);
  lowerJaw.rotation.x = -0.16;
  lowerJaw.scale.set(1.08, 0.95, 0.96);
  lowerJaw.userData.leviathanLowerJaw = true;
  lowerJaw.userData.baseRotationX = lowerJaw.rotation.x;
  lowerJaw.castShadow = true;
  group.add(lowerJaw);

  for (let side of [-1, 1]) {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 7), darkHide);
    eyeSocket.scale.set(1.72, 0.42, 0.32);
    eyeSocket.position.set(side * 2.18, 3.62, -7.82);
    eyeSocket.rotation.y = side * 0.36;
    eyeSocket.rotation.z = side * -0.2;
    eyeSocket.castShadow = true;
    group.add(eyeSocket);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 7), eyeMat);
    eye.scale.set(1.35, 0.34, 0.18);
    eye.position.set(side * 2.24, 3.6, -8.1);
    eye.rotation.y = side * 0.34;
    eye.rotation.z = side * -0.1;
    group.add(eye);

    const templePlate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 1.45), darkHide);
    templePlate.position.set(side * 1.88, 4.18, -5.58);
    templePlate.rotation.set(-0.32, side * 0.22, side * 0.14);
    templePlate.castShadow = true;
    group.add(templePlate);

    const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.48), darkHide);
    nostril.position.set(side * 0.54, 2.32, -10.42);
    nostril.rotation.y = side * 0.18;
    nostril.rotation.x = -0.18;
    group.add(nostril);

    for (let i = 0; i < 7; i++) {
      const topTooth = new THREE.Mesh(new THREE.ConeGeometry(0.12 + i * 0.014, 0.78 + i * 0.07, 6), toothMat);
      topTooth.position.set(side * (0.18 + i * 0.34), 1.42, -7.2 - i * 0.36);
      topTooth.rotation.x = Math.PI;
      topTooth.userData.leviathanUpperJaw = true;
      topTooth.userData.baseRotationX = topTooth.rotation.x;
      group.add(topTooth);
      const bottomTooth = new THREE.Mesh(new THREE.ConeGeometry(0.11 + i * 0.012, 0.62 + i * 0.05, 6), toothMat);
      bottomTooth.position.set(side * (0.2 + i * 0.32), 1.22, -6.96 - i * 0.3);
      bottomTooth.rotation.x = 0.1;
      bottomTooth.userData.leviathanLowerJaw = true;
      bottomTooth.userData.baseRotationX = bottomTooth.rotation.x;
      group.add(bottomTooth);
    }

    for (let i = 0; i < 3; i++) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46 - i * 0.035, 0.14), scarMat);
      gill.position.set(side * 3.32, 2.16 - i * 0.36, -4.82 + i * 0.2);
      gill.rotation.y = side * 0.86;
      gill.rotation.z = side * 0.14;
      group.add(gill);
    }
  }

  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.24 + Math.sin(t * Math.PI) * 0.28, 1.55 + Math.sin(t * Math.PI) * 1.15, 6), darkHide);
    crest.position.set(0, 2.62 + t * 2.05, 2.8 - t * 9.2);
    crest.rotation.x = Math.PI - 0.1;
    crest.castShadow = true;
    group.add(crest);
  }

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const side = i % 2 ? 1 : -1;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5 - t * 0.14, 0.1, 0.42 + t * 0.12), reptileDark);
    plate.position.set(side * (0.72 + Math.sin(t * Math.PI) * 0.9), 3.18 + Math.sin(t * Math.PI) * 0.35, -3.8 - t * 5.8);
    plate.rotation.set(-0.16, side * 0.32, side * 0.12);
    plate.castShadow = true;
    group.add(plate);
  }

  for (let i = 0; i < 3; i++) {
    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.78 + i * 0.12), scarMat);
    slash.position.set((i % 2 ? 1 : -1) * (0.75 + i * 0.32), 3.0 + Math.sin(i) * 0.28, -5.7 - i * 0.52);
    slash.rotation.set(0.2, (i % 2 ? 0.6 : -0.6), (i % 2 ? 0.45 : -0.45));
    group.add(slash);
  }

  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const p = bodyPath.getPoint(t);
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.92 - t * 0.48, 3.3 - t * 1.55, 6),
      darkHide
    );
    spine.position.copy(p);
    spine.position.y += 3.75 - t * 1.75;
    spine.rotation.x = Math.PI - 0.22 + Math.sin(t * Math.PI * 3) * 0.1;
    spine.rotation.z = Math.sin(t * Math.PI * 2) * 0.22;
    spine.castShadow = true;
    group.add(spine);
  }

  const waterMask = new THREE.Mesh(new THREE.RingGeometry(3.8, 6.8, 36), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  waterMask.rotation.x = -Math.PI / 2;
  waterMask.position.y = -2.8;
  group.add(waterMask);

  return group;
}

function setLeviathanJawOpen(group, open, crush = 0) {
  const amount = clamp(open, 0, 1);
  group.traverse((child) => {
    if (child.userData?.leviathanUpperJaw) {
      child.rotation.x = (child.userData.baseRotationX ?? child.rotation.x) - amount * 0.48 + crush * 0.1;
    }
    if (child.userData?.leviathanLowerJaw) {
      child.rotation.x = (child.userData.baseRotationX ?? child.rotation.x) + amount * 0.78 - crush * 0.16;
    }
  });
}

function makeLeviathanMouthDebris(shipType = state.shipType) {
  const group = new THREE.Group();
  const ship = getShipStats(shipType);
  const plankMat = mat(0x8b5a32);
  const darkWood = mat(0x4d2f1d);
  const sailMat = new THREE.MeshBasicMaterial({ color: ship.color || 0xd9c3a0, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 1.4 + Math.random() * 1.2), i % 3 ? plankMat : darkWood);
    plank.position.set((Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 2.0);
    plank.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    plank.castShadow = true;
    group.add(plank);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 7), darkWood);
  mast.position.set(-0.65, 0.15, -0.25);
  mast.rotation.set(0.8, 0.35, -1.05);
  mast.castShadow = true;
  group.add(mast);
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0.85, 0,
    1.55, -0.45, 0.08,
    -0.95, -0.72, -0.05,
  ], 3));
  sailGeo.setIndex([0, 1, 2]);
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0.15, 0.05, -0.55);
  sail.rotation.set(-0.35, 0.4, 0.25);
  group.add(sail);
  group.visible = false;
  return group;
}

function makeTaperedTubeGeometry(curve, baseRadius, tipRadius, options = {}) {
  const segments = options.segments || 14;
  const radialSegments = options.radialSegments || 7;
  const oval = options.oval || 0.88;
  const frames = curve.computeFrenetFrames(segments, false);
  const vertices = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const radius = baseRadius + (tipRadius - baseRadius) * t;
    const normal = frames.normals[i];
    const binormal = frames.binormals[i];
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle) * radius)
        .add(binormal.clone().multiplyScalar(Math.sin(angle) * radius * oval));
      vertices.push(point.x + radial.x, point.y + radial.y, point.z + radial.z);
    }
  }
  for (let i = 0; i < segments; i++) {
    const ring = i * radialSegments;
    const nextRing = (i + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }
  if (!options.openStart) {
    const frontCenter = vertices.length / 3;
    const start = curve.getPointAt(0);
    vertices.push(start.x, start.y, start.z);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(frontCenter, (j + 1) % radialSegments, j);
    }
  }
  if (!options.openEnd) {
    const backCenter = vertices.length / 3;
    const end = curve.getPointAt(1);
    vertices.push(end.x, end.y, end.z);
    const backRing = segments * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      indices.push(backCenter, backRing + j, backRing + ((j + 1) % radialSegments));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeTaperedTentacle(curve, baseRadius, tipRadius, material, options = {}) {
  const group = new THREE.Group();
  const tentacle = new THREE.Mesh(makeTaperedTubeGeometry(curve, baseRadius, tipRadius, options), material);
  tentacle.castShadow = true;
  group.add(tentacle);
  if (options.suckerMat) {
    const suckerTs = options.suckerTs || [0.32, 0.48, 0.64, 0.8];
    suckerTs.forEach((t, index) => {
      const point = curve.getPoint(t);
      const size = Math.max(0.12, baseRadius * 0.38 - index * 0.04);
      const sucker = new THREE.Mesh(new THREE.SphereGeometry(size, 7, 5), options.suckerMat);
      sucker.position.copy(point);
      sucker.position.y -= baseRadius * 0.62;
      sucker.scale.y = 0.26;
      group.add(sucker);
    });
  }
  return group;
}

function makeKrakenCoreGeometry() {
  const radialSegments = 20;
  const rings = [
    { z: -9.4, rx: 0.9, ry: 0.55, cy: 1.05 },
    { z: -8.45, rx: 3.55, ry: 1.75, cy: 1.62 },
    { z: -7.2, rx: 5.9, ry: 2.9, cy: 2.08 },
    { z: -5.65, rx: 7.45, ry: 3.85, cy: 2.45 },
    { z: -3.55, rx: 8.25, ry: 4.75, cy: 2.72 },
    { z: -1.1, rx: 8.55, ry: 5.28, cy: 2.96 },
    { z: 1.25, rx: 7.55, ry: 5.45, cy: 3.15 },
    { z: 3.35, rx: 5.65, ry: 4.92, cy: 3.42 },
    { z: 5.05, rx: 3.25, ry: 3.42, cy: 3.84 },
    { z: 6.3, rx: 0.65, ry: 0.85, cy: 4.05 },
  ];
  const upper = new THREE.Color(0x941517);
  const belly = new THREE.Color(0xc83d2e);
  const dark = new THREE.Color(0x3d080b);
  const vertices = [];
  const colors = [];
  const indices = [];

  rings.forEach((ring, i) => {
    const t = i / (rings.length - 1);
    const shoulder = Math.sin(t * Math.PI);
    for (let j = 0; j < radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const surfaceRipple = 1
        + Math.sin(angle * 3 + t * 5.3) * 0.028
        + Math.sin(angle * 7 - t * 4.1) * 0.014;
      const topLift = Math.max(0, s) * shoulder * 0.28;
      const bottomFlatten = s < 0 ? 0.58 : 1;
      const x = c * ring.rx * surfaceRipple;
      const y = ring.cy + s * ring.ry * bottomFlatten + topLift;
      const z = ring.z + Math.sin(angle * 2 + i * 0.45) * 0.1 * (0.35 + shoulder);
      vertices.push(x, y, z);

      const undersideBlend = clamp((-s - 0.14) / 0.86, 0, 1) * (0.92 - t * 0.18);
      const ridgeBlend = Math.max(0, s - 0.76) * 0.42 + Math.max(0, Math.abs(c) - 0.86) * 0.16;
      const color = upper.clone().lerp(belly, undersideBlend).lerp(dark, clamp(ridgeBlend, 0, 0.34));
      colors.push(color.r, color.g, color.b);
    }
  });

  for (let i = 0; i < rings.length - 1; i++) {
    const ring = i * radialSegments;
    const nextRing = (i + 1) * radialSegments;
    for (let j = 0; j < radialSegments; j++) {
      const next = (j + 1) % radialSegments;
      indices.push(ring + j, nextRing + j, ring + next);
      indices.push(ring + next, nextRing + j, nextRing + next);
    }
  }

  const frontCenter = vertices.length / 3;
  vertices.push(0, rings[0].cy, rings[0].z);
  colors.push(upper.r, upper.g, upper.b);
  for (let j = 0; j < radialSegments; j++) {
    indices.push(frontCenter, j, (j + 1) % radialSegments);
  }

  const backCenter = vertices.length / 3;
  const lastRing = rings[rings.length - 1];
  vertices.push(0, lastRing.cy, lastRing.z);
  colors.push(dark.r, dark.g, dark.b);
  const backRing = (rings.length - 1) * radialSegments;
  for (let j = 0; j < radialSegments; j++) {
    indices.push(backCenter, backRing + ((j + 1) % radialSegments), backRing + j);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeKrakenMesh() {
  const group = new THREE.Group();
  const lowMat = (color, options = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.02,
    flatShading: options.flatShading ?? false,
    vertexColors: options.vertexColors || false,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: options.side || THREE.DoubleSide,
  });
  const bodyMat = lowMat(0xffffff, { vertexColors: true });
  const skin = lowMat(0xb3201c);
  const darkSkin = lowMat(0x3d080b);
  const suckerMat = lowMat(0xf06a50);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xfff15a,
    emissive: 0xffd400,
    emissiveIntensity: 1.65,
    roughness: 0.34,
    metalness: 0,
  });
  const pupilMat = lowMat(0x16112a);

  const core = new THREE.Mesh(makeKrakenCoreGeometry(), bodyMat);
  core.castShadow = true;
  group.add(core);

  const mantleCap = new THREE.Mesh(new THREE.SphereGeometry(6.65, 24, 12), darkSkin);
  mantleCap.scale.set(1.02, 0.34, 0.62);
  mantleCap.position.set(0, 5.05, -1.25);
  mantleCap.castShadow = true;
  group.add(mantleCap);

  for (let side of [-1, 1]) {
    const sideMantle = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 9), skin);
    sideMantle.scale.set(0.52, 0.42, 1.18);
    sideMantle.position.set(side * 5.15, 2.55, -3.35);
    sideMantle.rotation.z = side * -0.18;
    sideMantle.castShadow = true;
    group.add(sideMantle);
  }

  const faceBulge = new THREE.Mesh(new THREE.SphereGeometry(5.25, 22, 12), skin);
  faceBulge.scale.set(1.03, 0.5, 0.5);
  faceBulge.position.set(0, 2.25, -6.9);
  faceBulge.castShadow = true;
  group.add(faceBulge);

  const cheekMantle = new THREE.Mesh(new THREE.SphereGeometry(5.8, 18, 10), darkSkin);
  cheekMantle.scale.set(1.1, 0.18, 0.36);
  cheekMantle.position.set(0, 1.3, -5.7);
  cheekMantle.castShadow = true;
  group.add(cheekMantle);

  const beakUpper = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.55, 9), pupilMat);
  beakUpper.position.set(0, 1.56, -9.0);
  beakUpper.rotation.x = -Math.PI / 2;
  beakUpper.scale.set(1.35, 0.72, 0.92);
  beakUpper.castShadow = true;
  group.add(beakUpper);
  const beakLower = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.25, 9), pupilMat);
  beakLower.position.set(0, 0.86, -8.72);
  beakLower.rotation.x = Math.PI / 2;
  beakLower.scale.set(1.15, 0.62, 0.85);
  beakLower.castShadow = true;
  group.add(beakLower);

  const mouthShadow = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 7), pupilMat);
  mouthShadow.scale.set(1.35, 0.32, 0.32);
  mouthShadow.position.set(0, 1.16, -8.78);
  group.add(mouthShadow);

  for (let side of [-1, 1]) {
    const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(1.08, 14, 8), darkSkin);
    eyeSocket.scale.set(1.6, 0.58, 0.36);
    eyeSocket.position.set(side * 2.85, 3.18, -8.48);
    eyeSocket.rotation.y = side * 0.22;
    eyeSocket.rotation.z = side * -0.08;
    eyeSocket.castShadow = true;
    group.add(eyeSocket);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8), eyeMat);
    eye.scale.set(1.25, 0.52, 0.2);
    eye.position.set(side * 2.9, 3.2, -8.96);
    eye.rotation.y = side * 0.2;
    group.add(eye);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.76, 14, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe64d, transparent: true, opacity: 0.38 })
    );
    glow.scale.set(1.45, 0.6, 0.24);
    glow.position.copy(eye.position);
    glow.rotation.copy(eye.rotation);
    group.add(glow);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.08), pupilMat);
    pupil.position.set(side * 2.92, 3.2, -9.08);
    pupil.rotation.y = side * 0.2;
    group.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.25, 0.3), darkSkin);
    brow.position.set(side * 2.76, 3.68, -8.84);
    brow.rotation.y = side * 0.2;
    brow.rotation.z = side * 0.28;
    brow.castShadow = true;
    group.add(brow);

    const cheekGroove = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 1.6), darkSkin);
    cheekGroove.position.set(side * 3.85, 2.3, -6.92);
    cheekGroove.rotation.y = side * 0.7;
    cheekGroove.rotation.z = side * -0.28;
    group.add(cheekGroove);
  }

  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.52 - Math.abs(t - 0.5) * 0.28, 2.1 - Math.abs(t - 0.5) * 0.65, 7), darkSkin);
    spike.position.set((t - 0.5) * 5.9, 6.15 + Math.sin(t * Math.PI) * 1.05, -3.6 + Math.cos(t * Math.PI) * 1.4);
    spike.rotation.x = Math.PI;
    spike.rotation.z = (t - 0.5) * -0.45;
    spike.castShadow = true;
    group.add(spike);
  }

  for (let side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.14 + i * 0.018, 0.52 + i * 0.05, 6), lowMat(0xf0d9b7));
      hook.position.set(side * (0.44 + i * 0.34), 0.86 + i * 0.08, -8.18 - i * 0.18);
      hook.rotation.x = Math.PI * 0.86;
      hook.rotation.z = side * 0.08;
      hook.castShadow = true;
      group.add(hook);
    }
  }

  const tentacleAngles = Array.from({ length: 8 }, (_, i) => -Math.PI + i * (Math.PI / 4));
  tentacleAngles.forEach((angle, i) => {
    const outward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const tangent = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const root = new THREE.Vector3(outward.x * 10.2, -12.5, outward.z * 9.0 - 0.4);
    const surface = new THREE.Vector3(outward.x * 10.7, -0.62, outward.z * 9.7 - 0.4);
    const lift = 13.5 + (i % 2) * 3.6 + Math.abs(outward.z) * 1.8;
    const curl = (i % 2 ? 1 : -1) * (1.25 + (i % 3) * 0.32);
    const curve = new THREE.CatmullRomCurve3([
      root,
      surface.clone().add(new THREE.Vector3(0, -1.8, 0)),
      surface.clone().add(outward.clone().multiplyScalar(1.7)).add(tangent.clone().multiplyScalar(curl * 0.16)).add(new THREE.Vector3(0, lift * 0.34, 0)),
      surface.clone().add(outward.clone().multiplyScalar(3.1)).add(tangent.clone().multiplyScalar(curl * 0.34)).add(new THREE.Vector3(0, lift * 0.82, 0)),
      surface.clone().add(outward.clone().multiplyScalar(3.75)).add(tangent.clone().multiplyScalar(curl * 0.18)).add(new THREE.Vector3(0, lift * 1.15, 0)),
    ], false, "catmullrom", 0.34);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 2.05, 22), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.48, side: THREE.DoubleSide }));
    ring.position.copy(surface);
    ring.position.y = -0.38;
    ring.rotation.x = -Math.PI / 2;
    ring.userData.krakenWaterRing = true;
    ring.userData.phase = i * 0.7;
    group.add(ring);

    const tentacle = makeTaperedTentacle(curve, i < 4 ? 1.12 : 0.92, i < 4 ? 0.34 : 0.24, skin, {
      segments: 18,
      radialSegments: 9,
      suckerMat,
    });
    tentacle.userData.tentacle = true;
    tentacle.userData.phase = i * 0.74;
    tentacle.userData.anchor = surface.clone();
    tentacle.userData.homeY = 0;
    group.add(tentacle);

    for (let j = 0; j < 4; j++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.62 - j * 0.045, 0.025, 5, 12), darkSkin);
      const p = curve.getPoint(0.34 + j * 0.12);
      stripe.position.copy(p);
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(1.25, 0.55, 1);
      tentacle.add(stripe);
    }
  });

  for (let i = 0; i < 15; i++) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.38 - (i % 3) * 0.045, 7, 5), i % 4 ? darkSkin : suckerMat);
    spot.position.set(Math.sin(i * 2.1) * (2.2 + (i % 3) * 1.15), 4.4 + Math.sin(i) * 1.55, 0.9 + Math.cos(i * 1.3) * 2.45);
    spot.scale.y = 0.32;
    group.add(spot);
  }

  const waterShadow = new THREE.Mesh(new THREE.RingGeometry(8.2, 14.8, 42), new THREE.MeshBasicMaterial({ color: 0x0c4655, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  waterShadow.rotation.x = -Math.PI / 2;
  waterShadow.position.y = -0.52;
  group.add(waterShadow);

  group.userData.radius = 25;
  return group;
}

function syncKraken(data) {
  if (!data) return;
  if (!krakenBoss) {
    krakenBoss = {
      group: makeKrakenMesh(),
      hp: Number(data.hp) || 10000,
      maxHp: Number(data.maxHp) || 10000,
      alive: data.alive !== false,
      radius: Number(data.radius) || 25,
    };
    scene.add(krakenBoss.group);
  }
  krakenBoss.hp = Number(data.hp) || 0;
  krakenBoss.maxHp = Number(data.maxHp) || 10000;
  krakenBoss.alive = data.alive !== false;
  krakenBoss.radius = Number(data.radius) || 25;
  krakenBoss.defeatedAt = Number(data.defeatedAt) || 0;
  const lastPosition = krakenBoss.group.position.clone();
  krakenBoss.group.position.x = Number(data.x) || 0;
  krakenBoss.group.position.z = Number(data.z) || 0;
  const moved = krakenBoss.group.position.clone().sub(lastPosition);
  moved.y = 0;
  const serverRotation = Number(data.rotation);
  krakenBoss.group.rotation.y = Number.isFinite(serverRotation)
    ? serverRotation
    : moved.lengthSq() > 0.0025 ? Math.atan2(-moved.x, -moved.z) : 0;
  if (krakenBoss.alive) {
    krakenBoss.group.visible = true;
    krakenBoss.group.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.18;
  } else {
    const sinkAge = krakenBoss.defeatedAt ? Math.max(0, (Date.now() - krakenBoss.defeatedAt) / 1000) : 0;
    krakenBoss.group.position.y = -Math.min(9, sinkAge * 0.75);
    krakenBoss.group.visible = sinkAge < 18;
  }
}

function krakenSegmentHitboxEntry(startLocal, endLocal, hitbox) {
  const sx = (startLocal.x - hitbox.x) / hitbox.rx;
  const sy = (startLocal.y - hitbox.y) / hitbox.ry;
  const sz = (startLocal.z - hitbox.z) / hitbox.rz;
  const ex = (endLocal.x - hitbox.x) / hitbox.rx;
  const ey = (endLocal.y - hitbox.y) / hitbox.ry;
  const ez = (endLocal.z - hitbox.z) / hitbox.rz;
  const dx = ex - sx;
  const dy = ey - sy;
  const dz = ez - sz;
  const c = sx * sx + sy * sy + sz * sz - 1;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy + dz * dz;
  if (a <= 0.000001) return null;
  const b = 2 * (sx * dx + sy * dy + sz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  if (second >= 0 && second <= 1) return second;
  return null;
}

function projectileHitsKraken(shot, previousWorld = null) {
  if (!krakenBoss?.alive || !krakenBoss.group || !shot?.mesh) return false;
  const startWorld = previousWorld || shot.mesh.position;
  const endWorld = shot.mesh.position;
  const startLocal = krakenBoss.group.worldToLocal(krakenSweepStart.copy(startWorld));
  const endLocal = krakenBoss.group.worldToLocal(krakenSweepEnd.copy(endWorld));
  let entry = null;
  KRAKEN_PROJECTILE_HITBOXES.forEach((hitbox) => {
    const t = krakenSegmentHitboxEntry(startLocal, endLocal, hitbox);
    if (t !== null && (entry === null || t < entry)) entry = t;
  });
  if (entry === null) return false;
  if (previousWorld && entry > 0 && entry < 1) {
    krakenSweepHitWorld.copy(previousWorld).lerp(endWorld, entry);
    shot.mesh.position.copy(krakenSweepHitWorld);
  }
  return true;
}

function submergeKrakenTentacleNear(worldPoint) {
  if (!krakenBoss?.group) return;
  let closest = null;
  let closestDistance = Infinity;
  krakenBoss.group.children.forEach((child) => {
    if (!child.userData?.tentacle || !child.userData.anchor) return;
    const anchor = krakenBoss.group.localToWorld(child.userData.anchor.clone());
    const distance = dist2(anchor, worldPoint);
    if (distance < closestDistance) {
      closest = child;
      closestDistance = distance;
    }
  });
  if (!closest) return;
  const now = Date.now() / 1000;
  closest.userData.submergeStart = now;
  closest.userData.submergeUntil = now + KRAKEN_ATTACK_LIFE * 0.82;
  closest.userData.submergeDepth = 72;
}

function krakenAttackCurve(data, t) {
  const ease = (value) => value * value * (3 - 2 * value);
  const rise = ease(clamp(t / 0.36, 0, 1));
  const curl = ease(clamp((t - 0.18) / 0.42, 0, 1));
  const slam = ease(clamp((t - (KRAKEN_SLAM_T - 0.18)) / 0.18, 0, 1));
  const retreat = ease(clamp((t - (KRAKEN_SLAM_T + 0.08)) / 0.16, 0, 1));
  const target = data.target;
  const dir = data.dir;
  const side = data.side;
  const surface = data.surface;
  const root = data.root;

  const tipHidden = surface.clone().add(dir.clone().multiplyScalar(1.2));
  tipHidden.y = -30;
  const tipRaised = target.clone().add(dir.clone().multiplyScalar(-5.5)).add(side.clone().multiplyScalar(2.2));
  tipRaised.y = 22;
  const tipHover = target.clone().add(dir.clone().multiplyScalar(-2)).add(side.clone().multiplyScalar(0.7));
  tipHover.y = 18;
  const tipStrike = target.clone().add(new THREE.Vector3(0, 0.9, 0));
  const tipGone = surface.clone().add(dir.clone().multiplyScalar(2.4));
  tipGone.y = -28;
  const tip = tipHidden.clone()
    .lerp(tipRaised, rise)
    .lerp(tipHover, curl * 0.55)
    .lerp(tipStrike, slam)
    .lerp(tipGone, retreat);

  const base = surface.clone();
  base.y = -9 + rise * 9 - retreat * 9;
  const lower = surface.clone().add(dir.clone().multiplyScalar(1.8));
  lower.y = -16 + rise * 19 - retreat * 11;
  const upper = target.clone().add(dir.clone().multiplyScalar(-7.5)).add(side.clone().multiplyScalar(2.8));
  upper.y = -5 + rise * 23 + curl * 4 - slam * 8 - retreat * 8;
  const bend = target.clone().add(dir.clone().multiplyScalar(-3.8)).add(side.clone().multiplyScalar(1.2));
  bend.y = 5 + rise * 13 + curl * 4 - slam * 14 - retreat * 7;

  return new THREE.CatmullRomCurve3([
    root.clone(),
    base,
    lower,
    upper,
    bend,
    tip,
  ], false, "catmullrom", 0.45);
}

function makeKrakenAttackEffect(attack, options = {}) {
  const group = new THREE.Group();
  const initialAge = Math.max(0, Number(options.initialAge) || 0);
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  group.userData.krakenAttack = true;
  const attackMat = new THREE.MeshStandardMaterial({
    color: 0xb82724,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: false,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const attackData = {
    target,
    source,
    dir,
    side,
    surface: target.clone().add(dir.clone().multiplyScalar(-6.5)).add(side.clone().multiplyScalar(2.2)),
    root: target.clone().add(dir.clone().multiplyScalar(-6.8)).add(side.clone().multiplyScalar(2.2)).add(new THREE.Vector3(0, -44, 0)),
  };
  attackData.surface.y = 0;
  const tubeOptions = {
    segments: 44,
    radialSegments: 13,
    openStart: true,
    openEnd: false,
    oval: 0.82,
  };
  const tentacle = new THREE.Mesh(makeTaperedTubeGeometry(krakenAttackCurve(attackData, 0), 2.2, 0.28, tubeOptions), attackMat.clone());
  tentacle.castShadow = true;
  tentacle.userData.krakenAttackTentacle = true;
  tentacle.userData.attackData = attackData;
  tentacle.userData.baseRadius = 2.2;
  tentacle.userData.tipRadius = 0.28;
  tentacle.userData.tubeOptions = tubeOptions;
  group.add(tentacle);

  for (let i = 0; i < 11; i++) {
    const sucker = new THREE.Mesh(new THREE.SphereGeometry(0.28 - i * 0.015, 8, 5), new THREE.MeshStandardMaterial({ color: 0xd76b55, roughness: 0.86, metalness: 0.02 }));
    sucker.scale.y = 0.28;
    sucker.userData.krakenAttackSucker = true;
    sucker.userData.curveT = 0.2 + i * 0.06;
    group.add(sucker);
  }

  const splash = new THREE.Mesh(new THREE.RingGeometry(5.2, 14.0, 54), new THREE.MeshBasicMaterial({ color: 0xe9fdff, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
  splash.position.copy(target);
  splash.position.y = 0.12;
  splash.rotation.x = -Math.PI / 2;
  splash.userData.baseScale = 0.9;
  splash.visible = false;
  splash.userData.krakenSplash = true;
  group.add(splash);
  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2 + Math.random() * 0.16;
    const radius = 2.5 + Math.random() * 5.5;
    const spray = new THREE.Mesh(
      new THREE.SphereGeometry(0.24 + Math.random() * 0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: i % 4 ? 0xf1fdff : 0x9eddea, transparent: true, opacity: 0 })
    );
    spray.position.set(target.x + Math.cos(angle) * radius, 0.24, target.z + Math.sin(angle) * radius);
    spray.userData.krakenSlamSpray = true;
    spray.userData.start = spray.position.clone();
    spray.userData.velocity = new THREE.Vector3(Math.cos(angle) * (5.5 + Math.random() * 6), 9 + Math.random() * 12, Math.sin(angle) * (5.5 + Math.random() * 6));
    group.add(spray);
  }
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const radius = 7.2 + Math.random() * 3.2;
    const height = 8 + Math.random() * 10;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.1 + Math.random() * 0.7, height, 0.34),
      new THREE.MeshBasicMaterial({ color: i % 3 ? 0xafeef8 : 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    );
    wall.position.set(target.x + Math.cos(angle) * radius, height * 0.45, target.z + Math.sin(angle) * radius);
    wall.rotation.y = -angle;
    wall.userData.krakenWaterWall = true;
    wall.userData.baseY = wall.position.y;
    wall.userData.height = height;
    wall.userData.radius = radius;
    wall.userData.angle = angle;
    group.add(wall);
  }
  const riseSplash = new THREE.Mesh(new THREE.RingGeometry(4.8, 9.2, 42), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
  riseSplash.position.copy(attackData.surface);
  riseSplash.position.y = 0.1;
  riseSplash.rotation.x = -Math.PI / 2;
  riseSplash.userData.krakenRiseSplash = true;
  group.add(riseSplash);
  addImpactEffect(group, KRAKEN_ATTACK_LIFE, {
    initialAge,
    maxWallAge: KRAKEN_ATTACK_REPLAY_MAX_AGE_MS,
  });
  addWaveHazard(target, { dps: 10, force: 22, radiusStart: 5.2, radiusEnd: 25, thickness: 3.4, life: 1.55, delay: Math.max(0, KRAKEN_SLAM_DELAY_MS / 1000 - initialAge) });
}

function krakenAttackWallContains(position, attack, padding = 0) {
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const offset = position.clone().sub(target);
  offset.y = 0;
  const along = Math.abs(offset.dot(dir));
  const across = Math.abs(offset.dot(side));
  return along <= 7 + padding && across <= 17 + padding;
}

function krakenAttackSlamContains(position, attack, padding = 0) {
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  return dist2(position, target) <= 6.5 + padding;
}

function krakenAttackEvadePoint(position, attack, shipType = "skiff") {
  if (!attack) return null;
  const padding = shipHitRadius(shipType) + 5;
  if (!krakenAttackSlamContains(position, attack, padding) && !krakenAttackWallContains(position, attack, padding * 0.45)) return null;
  const target = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  const source = new THREE.Vector3(Number(attack.sourceX) || target.x + 18, 0, Number(attack.sourceZ) || target.z + 18);
  const dir = target.clone().sub(source);
  if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const offset = position.clone().sub(target);
  offset.y = 0;
  const sideSign = offset.dot(side) >= 0 ? 1 : -1;
  const away = position.clone().sub(target);
  away.y = 0;
  if (away.lengthSq() < 0.01) away.copy(side).multiplyScalar(sideSign);
  away.normalize().multiplyScalar(70);
  const dodge = side.multiplyScalar(sideSign * 105).add(away);
  const point = position.clone().add(dodge);
  point.x = clamp(point.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
  point.z = clamp(point.z, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
  point.y = 0;
  return point;
}

function activeKrakenEvadePoint(position, shipType = "skiff") {
  const now = clock.elapsedTime;
  const nowWall = Date.now();
  for (let i = activeKrakenAttacks.length - 1; i >= 0; i--) {
    if ((activeKrakenAttacks[i].until || 0) < now || (activeKrakenAttacks[i].untilWall || 0) < nowWall) {
      activeKrakenAttacks.splice(i, 1);
      continue;
    }
    const evade = krakenAttackEvadePoint(position, activeKrakenAttacks[i], shipType);
    if (evade) return evade;
  }
  return null;
}

function applyKrakenAttack(attack) {
  if (!attack) return;
  const sentAt = Number(attack.sentAt);
  const ageMs = Number.isFinite(sentAt) ? Math.max(0, Date.now() - sentAt) : 0;
  if (ageMs > KRAKEN_ATTACK_REPLAY_MAX_AGE_MS) return;
  const initialAge = ageMs / 1000;
  const slamPoint = new THREE.Vector3(Number(attack.x) || 0, 0, Number(attack.z) || 0);
  activeKrakenAttacks.push({
    ...attack,
    until: clock.elapsedTime + Math.max(0, KRAKEN_ATTACK_LIFE - initialAge),
    untilWall: Date.now() + Math.max(0, KRAKEN_ATTACK_LIFE * 1000 - ageMs),
  });
  submergeKrakenTentacleNear(slamPoint);
  makeKrakenAttackEffect(attack, { initialAge });
  const damageDelay = Math.max(0, KRAKEN_SLAM_DELAY_MS - ageMs);
  const startedWall = Date.now() - ageMs;
  setTimeout(() => {
    if (Date.now() - startedWall > KRAKEN_SLAM_DELAY_MS + 800) return;
    const attackDamage = Number.isFinite(Number(attack.damage)) ? Number(attack.damage) : 2980;
    if (state.mode === "ship" && (krakenAttackSlamContains(playerShip.position, attack, shipHitRadius(state.shipType)) || krakenAttackWallContains(playerShip.position, attack, shipHitRadius(state.shipType) * 0.4))) {
      damageTarget(state, attackDamage);
    }
    if (!multiplayer.serverWorld) {
      bots.forEach((bot) => {
        if (krakenAttackSlamContains(bot.group.position, attack, shipHitRadius(bot.shipType)) || krakenAttackWallContains(bot.group.position, attack, shipHitRadius(bot.shipType) * 0.4)) {
          damageTarget(bot, attackDamage);
        }
      });
    }
  }, damageDelay);
}

function makeLeviathanAttackEffect(position, outward, attackId) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.position.y = 0.08;
  const side = new THREE.Vector3(outward.z, 0, -outward.x).normalize();
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.82, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 10.6, 42), foamMat);
  ring.rotation.x = -Math.PI / 2;
  ring.userData.baseScale = 1.0;
  group.add(ring);
  for (let i = 0; i < 3; i++) {
    const wake = new THREE.Mesh(
      new THREE.RingGeometry(1.2 + i * 0.8, 1.9 + i * 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.36 - i * 0.06, side: THREE.DoubleSide })
    );
    wake.position.copy(outward.clone().multiplyScalar(-2.4 - i * 2.7));
    wake.rotation.x = -Math.PI / 2;
    wake.scale.x = 1.8 + i * 0.35;
    wake.scale.y = 0.55;
    wake.userData.baseScale = 1;
    group.add(wake);
  }
  for (let i = 0; i < 24; i++) {
    const spray = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.2, 6, 5), new THREE.MeshBasicMaterial({ color: i % 4 ? 0xf1fdff : 0x9eddea, transparent: true, opacity: 0.86 }));
    spray.position.copy(side.clone().multiplyScalar((Math.random() - 0.5) * 13)).add(outward.clone().multiplyScalar((Math.random() - 0.5) * 7));
    spray.position.y = 0.3 + Math.random() * 0.8;
    spray.userData.velocity = side.clone().multiplyScalar((Math.random() - 0.5) * 7)
      .add(outward.clone().multiplyScalar(-2.4 - Math.random() * 4.4))
      .add(new THREE.Vector3(0, 3 + Math.random() * 4.2, 0));
    group.add(spray);
  }
  addImpactEffect(group, attackId === "crush" ? 1.25 : 1.75);
  addWaveHazard(position, { dps: 0, force: 30, radiusStart: 6, radiusEnd: 28, thickness: 4.5, life: 1.8, damageShips: false });
}

function leviathanAttackHits(position, impactPoint, sideDir, type = state.shipType) {
  const offset = position.clone().sub(impactPoint);
  offset.y = 0;
  const forward = sideDir.clone().normalize();
  const cross = new THREE.Vector3(forward.z, 0, -forward.x);
  const along = Math.abs(offset.dot(forward));
  const across = Math.abs(offset.dot(cross));
  return along <= 11 + shipHitRadius(type) * 0.35 && across <= 8 + shipHitRadius(type) * 0.45;
}

function leviathanVector(data, key, fallback = new THREE.Vector3()) {
  return new THREE.Vector3(
    Number.isFinite(Number(data?.[`${key}X`])) ? Number(data[`${key}X`]) : fallback.x,
    Number.isFinite(Number(data?.[`${key}Y`])) ? Number(data[`${key}Y`]) : fallback.y,
    Number.isFinite(Number(data?.[`${key}Z`])) ? Number(data[`${key}Z`]) : fallback.z,
  );
}

function ownServerTarget(id) {
  return Boolean(id && (id === multiplayer.networkId || id === playerId));
}

function syncServerLeviathan(data) {
  if (!data?.id) {
    if (leviathan?.serverControlled) {
      scene.remove(leviathan.group);
      leviathan = null;
      state.leviathanGrabbed = false;
      if (playerShip) playerShip.visible = true;
    }
    return;
  }
  const sideDir = new THREE.Vector3(Number(data.sideX) || 1, 0, Number(data.sideZ) || 0);
  if (sideDir.lengthSq() < 0.01) sideDir.set(1, 0, 0);
  sideDir.normalize();
  const impactPoint = leviathanVector(data, "impact");
  const startPosition = leviathanVector(data, "start", impactPoint.clone().add(sideDir.clone().multiplyScalar(64)).setY(-24));
  const smashPosition = leviathanVector(data, "smash", impactPoint.clone().add(sideDir.clone().multiplyScalar(8.6)).setY(0.55));
  const divePosition = leviathanVector(data, "dive", impactPoint.clone().add(sideDir.clone().multiplyScalar(-30)).setY(-24));
  if (!leviathan || !leviathan.serverControlled || leviathan.serverId !== data.id) {
    if (leviathan?.group) scene.remove(leviathan.group);
    const group = makeLeviathanMesh();
    group.position.copy(startPosition);
    group.rotation.y = Math.atan2(sideDir.x, sideDir.z);
    group.rotation.x = 0.48;
    group.scale.setScalar(1.1);
    setLeviathanJawOpen(group, 1);
    scene.add(group);
    makeLeviathanAttackEffect(startPosition.clone().setY(0), sideDir, "breach");
    leviathan = {
      group,
      serverControlled: true,
      serverId: data.id,
      targetId: data.targetId,
      born: clock.elapsedTime - Math.max(0, (Date.now() - (Number(data.born) || Date.now())) / 1000),
      grabbed: false,
      crushed: false,
      damaged: false,
      sideDir: sideDir.clone(),
      attack: { id: "breach" },
      startPosition,
      smashPosition,
      divePosition,
      impactPoint,
      slamAt: 0,
    };
  }
  leviathan.targetId = data.targetId;
  leviathan.sideDir.copy(sideDir);
  leviathan.startPosition.copy(startPosition);
  leviathan.impactPoint.copy(impactPoint);
  leviathan.smashPosition.copy(smashPosition);
  leviathan.divePosition.copy(divePosition);
  leviathan.crushed = Boolean(data.crushed) || leviathan.crushed;
  leviathan.missed = Boolean(data.missed) || leviathan.missed;
  leviathan.serverHit = Boolean(data.hit) || leviathan.serverHit;
  leviathan.damaged = Boolean(data.damaged) || leviathan.damaged;
  if (Number.isFinite(Number(data.born))) leviathan.born = clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000);
  if (Number.isFinite(Number(data.slamAt))) leviathan.slamAt = clock.elapsedTime - Math.max(0, (Date.now() - Number(data.slamAt)) / 1000);
  if (leviathan.crushed && !leviathan.impactEffectMade) {
    leviathan.impactEffectMade = true;
    makeLeviathanAttackEffect(leviathan.impactPoint.clone().setY(0), sideDir, leviathan.serverHit ? "crush" : "miss");
  }
}

function applyServerLeviathanStrike(message) {
  const attack = message.attack || {};
  syncServerLeviathan({ ...attack, crushed: true, hit: Boolean(message.hit), missed: !message.hit, slamAt: attack.slamAt || Date.now() });
  if (!leviathan?.serverControlled) return;
  const sideDir = leviathan.sideDir || new THREE.Vector3(1, 0, 0);
  leviathan.crushed = true;
  leviathan.serverHit = Boolean(message.hit);
  leviathan.missed = !message.hit;
  if (!leviathan.slamAt) leviathan.slamAt = clock.elapsedTime;
  if (!leviathan.impactEffectMade) {
    leviathan.impactEffectMade = true;
    makeLeviathanAttackEffect(leviathan.impactPoint.clone().setY(0), sideDir, message.hit ? "crush" : "miss");
  }
  if (message.hit && ownServerTarget(leviathan.targetId) && state.mode === "ship") {
    state.leviathanGrabbed = true;
    state.velocity.set(0, 0, 0);
    playerShip.position.copy(leviathan.impactPoint);
    playerShip.position.y = SHIP_WATERLINE_Y + 0.18;
    state.position.copy(playerShip.position);
    makeSplinterEffect(playerShip.position.clone().add(new THREE.Vector3(0, 1.0, 0)), sideDir.clone().multiplyScalar(-1));
    playerShip.visible = false;
  }
}

function applyServerLeviathanDamage(message) {
  if (!ownServerTarget(message.targetId) || state.mode !== "ship") return;
  damageTarget(state, maxHp() * 4);
}

function summonLeviathan() {
  if (leviathan || clock.elapsedTime < leviathanCooldown || state.mode !== "ship") return;
  leviathanCooldown = clock.elapsedTime + 10.2;
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  const outward = playerShip.position.clone().setY(0);
  if (outward.lengthSq() < 0.01) outward.copy(forward);
  outward.normalize();
  const sideDir = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
  if (sideDir.dot(outward) < 0) sideDir.multiplyScalar(-1);
  const attack = leviathanAttacks[Math.floor(Math.random() * leviathanAttacks.length)];
  const group = makeLeviathanMesh();
  const impactPoint = playerShip.position.clone();
  impactPoint.y = 0;
  const startPosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(64));
  startPosition.y = -24;
  const smashPosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(8.6));
  smashPosition.y = 0.55;
  const divePosition = impactPoint.clone().add(sideDir.clone().multiplyScalar(-30));
  divePosition.y = -24;
  group.position.copy(startPosition);
  group.rotation.y = Math.atan2(sideDir.x, sideDir.z);
  group.rotation.x = 0.48;
  group.scale.setScalar(1.1);
  setLeviathanJawOpen(group, 1);
  scene.add(group);
  makeLeviathanAttackEffect(startPosition.clone().setY(0), sideDir, "breach");
  leviathan = {
    group,
    born: clock.elapsedTime,
    grabbed: false,
    crushed: false,
    damaged: false,
    sideDir: sideDir.clone(),
    attack,
    startPosition,
    smashPosition,
    divePosition,
    impactPoint,
    slamAt: 0,
  };
}

function makeFish(data = null) {
  const group = new THREE.Group();
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 18), rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  group.add(ripple);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 4), mat(0x267c94));
  fin.position.y = 0.22;
  fin.rotation.x = Math.PI / 2;
  group.add(fin);
  const fishPoint = data ? new THREE.Vector3(Number(data.x) || 0, 0.15, Number(data.z) || 0) : randomWaterPoint(MAP_LIMIT * 0.92, 18);
  group.position.set(fishPoint.x, 0.15, fishPoint.z);
  group.userData.phase = Math.random() * 20;
  group.userData.kind = "fish";
  group.userData.serverId = data?.id || null;
  group.userData.speed = 8;
  group.userData.radius = 0.75;
  group.userData.direction = Number.isFinite(Number(data?.direction)) ? Number(data.direction) : Math.random() * Math.PI * 2;
  if (data?.id) group.userData.serverPosition = group.position.clone();
  scene.add(group);
  fish.push(group);
  return group;
}

function makeSquid(data = null) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), mat(0xb24f5d));
  body.scale.set(0.72, 0.45, 1.15);
  body.position.y = 0.24;
  group.add(body);
  for (let i = 0; i < 6; i++) {
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 1.05, 5), mat(0xd06d71));
    const angle = (i / 6) * Math.PI * 2;
    tentacle.position.set(Math.cos(angle) * 0.22, 0.12, 0.55 + Math.sin(angle) * 0.12);
    tentacle.rotation.x = Math.PI / 2 + Math.sin(angle) * 0.4;
    tentacle.rotation.z = angle;
    group.add(tentacle);
  }
  const point = data ? new THREE.Vector3(Number(data.x) || 0, 0.12, Number(data.z) || 0) : randomWaterPoint(MAP_LIMIT * 0.92, 18);
  group.position.set(point.x, 0.12, point.z);
  group.userData.phase = Math.random() * 20;
  group.userData.kind = "squid";
  group.userData.serverId = data?.id || null;
  group.userData.speed = 8;
  group.userData.radius = 1.05;
  group.userData.direction = Number.isFinite(Number(data?.direction)) ? Number(data.direction) : Math.random() * Math.PI * 2;
  if (data?.id) group.userData.serverPosition = group.position.clone();
  scene.add(group);
  fish.push(group);
  return group;
}

function makeWhale(data = null) {
  const group = new THREE.Group();
  const bodyMat = mat(0x315f89);
  const darkMat = mat(0x234b6c);
  const bellyMat = mat(0xb1d0df);
  const grooveMat = mat(0x6f9ebb);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x071018 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), bodyMat);
  body.scale.set(1.65, 0.46, 3.6);
  body.position.set(0, 0.42, -0.55);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 14), bodyMat);
  head.scale.set(1.95, 0.48, 1.28);
  head.position.set(0, 0.36, 2.55);
  head.castShadow = true;
  group.add(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10), bodyMat);
  snout.scale.set(1.72, 0.34, 0.62);
  snout.position.set(0, 0.31, 3.36);
  snout.castShadow = true;
  group.add(snout);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10), bellyMat);
  belly.scale.set(1.28, 0.12, 3.15);
  belly.position.set(0, 0.08, 0.82);
  group.add(belly);

  for (let i = -3; i <= 3; i++) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.022, 2.2), grooveMat);
    groove.position.set(i * 0.22, 0.02, 1.72);
    groove.rotation.x = -0.08;
    group.add(groove);
  }

  const tailStock = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.58, 2.4, 12), darkMat);
  tailStock.position.set(0, 0.36, -4.05);
  tailStock.rotation.x = Math.PI / 2;
  tailStock.scale.x = 0.72;
  tailStock.castShadow = true;
  group.add(tailStock);

  for (const side of [-1, 1]) {
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.72, 4), darkMat);
    fluke.position.set(side * 0.82, 0.36, -5.15);
    fluke.rotation.z = side * Math.PI / 2;
    fluke.rotation.y = side * 0.32;
    fluke.scale.set(1.25, 0.48, 0.12);
    fluke.castShadow = true;
    group.add(fluke);
  }

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.85, 4), darkMat);
  dorsal.position.set(0, 0.88, -2.15);
  dorsal.rotation.x = -0.22;
  dorsal.scale.z = 0.7;
  dorsal.castShadow = true;
  group.add(dorsal);

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.34, 2.25, 4), darkMat);
    fin.position.set(side * 1.82, 0.16, 1.05);
    fin.rotation.z = side * -1.22;
    fin.rotation.x = -0.38;
    fin.rotation.y = side * 0.18;
    fin.scale.set(0.62, 1, 0.16);
    fin.castShadow = true;
    group.add(fin);
  }

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 5), eyeMat);
    eye.position.set(side * 1.22, 0.56, 2.92);
    group.add(eye);
  }

  for (const side of [-1, 1]) {
    const blowhole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.34), darkMat);
    blowhole.position.set(side * 0.16, 0.84, 2.44);
    blowhole.rotation.y = side * 0.12;
    group.add(blowhole);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.02, 4), darkMat);
  tail.visible = false;
  tail.position.set(0, 0.25, -4.4);
  tail.rotation.x = Math.PI / 2;
  group.add(tail);

  const point = data
    ? new THREE.Vector3(Number(data.x) || 0, 0.05, Number(data.z) || WHALE_NORTH_CENTER_Z)
    : randomNorthernWaterPoint(MAP_LIMIT * 0.9, 70);
  group.position.set(point.x, 0.05, clamp(point.z, WHALE_NORTH_MIN_Z, WHALE_NORTH_MAX_Z));
  group.rotation.y = Number.isFinite(Number(data?.rotation)) ? Number(data.rotation) : Math.random() * Math.PI * 2;
  scene.add(group);
  const animal = {
    kind: "whale",
    serverId: data?.id || null,
    group,
    hp: Number(data?.hp) || 1000,
    maxHp: Number(data?.maxHp) || 1000,
    speed: 14,
    direction: group.rotation.y,
    bombImpulse: new THREE.Vector3(),
    turnAt: clock.elapsedTime + 3 + Math.random() * 5,
    submergedUntil: data?.submerged ? clock.elapsedTime + 1.2 : 0,
    ramCooldown: 0,
  };
  animals.push(animal);
  return animal;
}

function makeCrateMesh(x, z, kind = "crate") {
  const group = new THREE.Group();
  group.position.set(x, 0.65, z);
  group.rotation.y = Math.random() * Math.PI;
  if (kind === "whale") {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 0), mat(0x9db7c7));
    chunk.scale.set(1.2, 0.45, 0.86);
    chunk.position.y = 0.05;
    chunk.castShadow = true;
    group.add(chunk);
    const rind = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), mat(0x315f89));
    rind.scale.set(1.08, 0.2, 0.58);
    rind.position.set(-0.18, 0.28, 0.06);
    rind.castShadow = true;
    group.add(rind);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 5), new THREE.MeshBasicMaterial({ color: 0xe7f5f7, transparent: true, opacity: 0.6 }));
    shine.position.set(0.26, 0.48, 0.04);
    group.add(shine);
    scene.add(group);
    return group;
  }
  if (kind === "kraken") {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0, -0.4),
      new THREE.Vector3(-0.8, 0.55, 0.8),
      new THREE.Vector3(1.5, 0.15, 0.3),
      new THREE.Vector3(3.1, 0.45, -0.6),
    ]);
    const tentacle = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.42, 9, false), mat(0x6b3d69));
    tentacle.castShadow = true;
    group.add(tentacle);
    const glow = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.15, 24), new THREE.MeshBasicMaterial({ color: 0xf3c33b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.45;
    group.add(glow);
    scene.add(group);
    return group;
  }
  const isTreasure = kind === "treasure";
  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(isTreasure ? 1.65 : 1.25, isTreasure ? 1.12 : 1.05, isTreasure ? 1.35 : 1.25),
    isTreasure ? mats.gold : mats.crate
  );
  chest.castShadow = true;
  group.add(chest);
  if (isTreasure) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.18, 1.48), mats.dark);
    band.position.y = 0.13;
    band.castShadow = true;
    group.add(band);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.32, 1.18), mat(0xf6cc55));
    lid.position.y = 0.62;
    lid.castShadow = true;
    group.add(lid);
  }
  scene.add(group);
  return group;
}

function removeCrate(crate) {
  if (!crate) return;
  if (crate.serverId) serverCrateMap.delete(crate.serverId);
  scene.remove(crate.mesh);
  const index = crates.indexOf(crate);
  if (index >= 0) crates.splice(index, 1);
}

function dropCrates(pos, count) {
  for (let i = 0; i < count; i++) {
    crates.push({
      mesh: makeCrateMesh(pos.x + (Math.random() - 0.5) * 5, pos.z + (Math.random() - 0.5) * 5),
      kind: "crate",
      born: clock.elapsedTime,
      heal: 8 + Math.random() * 8,
      xp: 6 + Math.random() * 9,
      gold: 5 + Math.floor(Math.random() * 13),
    });
  }
}

function dropBlubberBits(pos, count = 0) {
  const total = clamp(Math.floor(Number(count) || 0), 0, 80);
  for (let i = 0; i < total; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.random() * Math.max(4, Math.sqrt(total) * 1.4);
    crates.push({
      mesh: makeCrateMesh(pos.x + Math.sin(angle) * radius, pos.z + Math.cos(angle) * radius, "whale"),
      kind: "whale",
      born: clock.elapsedTime,
      heal: 0,
      xp: 0,
      gold: 0,
      blubber: 1,
    });
  }
}

function dropPlayerDeathCrates(pos) {
  const count = crateDropCount(state);
  const droppedBlubber = blubberCount();
  if (droppedBlubber > 0) state.cargo["Whale Blubber"] = 0;
  if (multiplayer.serverWorld) {
    if (sendMultiplayer({
      type: "playerSunk",
      x: pos.x,
      z: pos.z,
      level: state.level,
      shipType: state.shipType,
      blubber: droppedBlubber,
    })) return;
  }
  dropCrates(pos, count);
  dropBlubberBits(pos, droppedBlubber);
  if (multiplayer.channel) {
    sendMultiplayer({
      type: "playerSunk",
      x: pos.x,
      z: pos.z,
      count,
      level: state.level,
      shipType: state.shipType,
      blubber: droppedBlubber,
    });
  }
}

function spawnTreasure(position = null) {
  const point = position || randomWaterPoint(MAP_LIMIT * 0.94, 55);
  crates.push({
    mesh: makeCrateMesh(point.x, point.z, "treasure"),
    kind: "treasure",
    born: clock.elapsedTime,
    heal: 18 + Math.random() * 14,
    xp: 440 + Math.random() * 240,
    gold: 220 + Math.floor(Math.random() * 160),
  });
}

function nearestTreasureTo(point, maxDistance = 150) {
  let best = null;
  let bestDist = maxDistance;
  crates.forEach((crate) => {
    if (crate.kind !== "treasure") return;
    const d = dist2(point, crate.mesh.position);
    if (d < bestDist) {
      best = crate;
      bestDist = d;
    }
  });
  return best;
}

function nearestPickupTo(point, maxDistance = 215, bot = null) {
  let best = null;
  let bestScore = Infinity;
  const healthNeed = bot?.shipType ? clamp((getShipStats(bot.shipType).hp - bot.hp) / getShipStats(bot.shipType).hp, 0, 1) : 0;
  crates.forEach((crate) => {
    if (islands.some((island) => dist2(crate.mesh.position, island.group.position) < island.radius + 8)) return;
    const d = dist2(point, crate.mesh.position);
    const valuable = crate.kind === "treasure" || crate.kind === "kraken";
    const searchDistance = crate.kind === "treasure"
      ? Math.min(maxDistance * 2.05, 430)
      : crate.kind === "kraken"
        ? Math.min(maxDistance * 1.65, 360)
        : Math.min(maxDistance, 260);
    if (d > searchDistance) return;
    const priority = crate.kind === "kraken" ? 0.2 : crate.kind === "treasure" ? 0.11 : crate.kind === "whale" ? 0.72 : 1 - healthNeed * 0.38;
    const score = d * priority - healthNeed * 36;
    if (score < bestScore) {
      best = crate;
      bestScore = score;
    }
  });
  return best;
}

function clearFishingRig() {
  if (fishingLine) scene.remove(fishingLine);
  if (fishingBobber) scene.remove(fishingBobber);
  fishingLine = null;
  fishingBobber = null;
  if (multiplayer.serverWorld) sendMultiplayer({ type: "clearFishBait" });
}

function nearestFishTo(point, maxDistance) {
  let best = null;
  let bestDist = maxDistance;
  fish.forEach((item) => {
    const d = dist2(point, item.position);
    if (d < bestDist) {
      best = item;
      bestDist = d;
    }
  });
  return best;
}

function fishHitRadius(item) {
  return item?.userData?.radius || (item?.userData?.kind === "squid" ? 1.05 : 0.75);
}

function removeFishItem(item) {
  if (!item) return;
  if (item.userData?.serverId) serverFishMap.delete(item.userData.serverId);
  scene.remove(item);
  const index = fish.indexOf(item);
  if (index >= 0) fish.splice(index, 1);
}

function startFishing(dir) {
  if (state.fishing) return toast("Already reeling. Hold steady.");
  const castPoint = playerShip.position.clone().add(dir.clone().multiplyScalar(12 + Math.random() * 8));
  castPoint.y = 0.18;
  fishingBobber = new THREE.Group();
  const bobberCore = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(0xf4f1df));
  bobberCore.position.y = 0.18;
  fishingBobber.add(bobberCore);
  const bobberTop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), mat(0xd84b3d));
  bobberTop.position.y = 0.48;
  fishingBobber.add(bobberTop);
  const splash = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  splash.rotation.x = -Math.PI / 2;
  fishingBobber.add(splash);
  fishingBobber.position.copy(castPoint);
  scene.add(fishingBobber);
  fishingLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0xf8f4e5, transparent: true, opacity: 0.92 })
  );
  setCylinderBetween(fishingLine, playerShip.position.clone().add(new THREE.Vector3(0, 1.45, 0)), castPoint.clone());
  scene.add(fishingLine);
  state.fishing = {
    target: null,
    castPoint: castPoint.clone(),
    timer: 0,
    biteTime: 0,
    reelTime: 0.9 + Math.random() * 1.25,
    phase: "waiting",
  };
  if (multiplayer.serverWorld) sendMultiplayer({ type: "fishBait", x: castPoint.x, z: castPoint.z, duration: 25 });
  toast("Line cast. Waiting for a bite...");
}

function finishFishing() {
  const target = state.fishing?.target;
  const kind = target?.userData?.kind === "squid" ? "Squid" : "Fish";
  if (target?.userData?.serverId && multiplayer.serverWorld) {
    if (!target.userData.pending) {
      target.userData.pending = true;
      sendMultiplayer({ type: "collectFish", id: target.userData.serverId, source: "Line" });
    }
    clearFishingRig();
    state.fishing = null;
    return;
  }
  if (target && fish.includes(target)) {
    removeFishItem(target);
  }
  clearFishingRig();
  state.fishing = null;
  state.gold += 16 + state.level * 3 + Math.floor(Math.random() * 14);
  addXP(22 + Math.floor(Math.random() * 10));
  toast(`${kind} reeled in after a hard pull.`);
  kind === "Squid" ? makeSquid() : makeFish();
}

function rewardFishCatch(item, source = "Line") {
  const kind = item?.userData?.kind === "squid" ? "Squid" : "Fish";
  if (item?.userData?.serverId && multiplayer.serverWorld) {
    if (item.userData.pending) return;
    item.userData.pending = true;
    sendMultiplayer({ type: "collectFish", id: item.userData.serverId, source });
    return;
  }
  if (item && fish.includes(item)) {
    removeFishItem(item);
  }
  state.gold += 16 + state.level * 3 + Math.floor(Math.random() * 14);
  addXP(22 + Math.floor(Math.random() * 10));
  if (source !== "quiet") toast(`${kind} caught by ${source}.`);
  kind === "Squid" ? makeSquid() : makeFish();
}

function pointTouchesWhalerNet(point) {
  if (state.shipType !== "whaler" || !state.whalerNets || !playerShip) return false;
  const progress = clamp(state.whalerNetProgress || 0, 0, 1);
  if (progress < 0.55) return false;
  const local = playerShip.worldToLocal(point.clone());
  const radius = shipHitRadius("whaler");
  const inner = radius * 0.28;
  const outer = inner + (4.4 * progress);
  return Math.abs(local.x) > inner
    && Math.abs(local.x) < outer
    && Math.abs(local.z) < radius * 1.26
    && local.y > -1.1
    && local.y < 2.2;
}

function updateWhalerNets() {
  if (state.mode !== "ship" || state.shipType !== "whaler" || !state.whalerNets || state.whalerNetProgress < 0.55) return;
  crates.slice().forEach((crate) => {
    if (pointTouchesWhalerNet(crate.mesh.position)) collectCrate(crate);
  });
  fish.slice().forEach((item) => {
    if (pointTouchesWhalerNet(item.position)) rewardFishCatch(item, "the nets");
  });
}

function alertBot(bot, seconds = 12) {
  bot.agroUntil = Math.max(bot.agroUntil || 0, clock.elapsedTime + seconds + bot.level * 0.8);
  bot.target = playerShip.position.clone();
  bot.turn = Math.min(bot.turn || 0, 0.2);
  bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.25);
}

function targetFireState(target) {
  return target === state ? state.fire : target?.fire;
}

function setTargetFireState(target, fire) {
  if (target === state) state.fire = fire;
  else if (target) target.fire = fire;
}

function targetShipGroup(target) {
  if (target === state) return playerShip;
  return target?.group || null;
}

function disposeVisualMesh(mesh) {
  if (!mesh) return;
  mesh.geometry?.dispose?.();
  if (Array.isArray(mesh.material)) mesh.material.forEach((item) => item?.dispose?.());
  else mesh.material?.dispose?.();
}

function clearBurnVisual(target) {
  const fire = targetFireState(target);
  if (!fire?.scorch) return;
  fire.scorch.parent?.remove(fire.scorch);
  disposeVisualMesh(fire.scorch);
  fire.scorch = null;
}

function addScorchMark(target, worldPosition = null) {
  const fire = targetFireState(target);
  const group = targetShipGroup(target);
  if (!fire || !group) return;
  if (!fire.scorch) {
    fire.scorch = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x120807, roughness: 0.98, metalness: 0, transparent: true, opacity: 0.88 })
    );
    fire.scorch.userData.burnScorch = true;
    group.add(fire.scorch);
  }
  const type = target === state ? state.shipType : target.shipType || STARTER_SHIP;
  const radius = shipHitRadius(type);
  const hit = worldPosition?.clone?.() || group.position.clone().add(new THREE.Vector3(0, 1.05, -radius * 0.16));
  const local = group.worldToLocal(hit);
  local.x = clamp(local.x, -radius * 0.72, radius * 0.72);
  local.y = clamp(local.y, 0.45, 2.4);
  local.z = clamp(local.z, -radius * 0.88, radius * 0.88);
  const size = clamp(radius * 0.13, 0.4, 0.92);
  fire.scorch.position.copy(local);
  fire.scorch.rotation.set(-0.18 + Math.random() * 0.14, Math.random() * Math.PI, Math.random() * 0.3);
  fire.scorch.scale.set(size * 1.35, size * 0.13, size * 0.72);
}

function makeBurnSmoke(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.16 + Math.random() * 0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x31343a : 0x5d5f62, transparent: true, opacity: 0.42 })
    );
    puff.position.set((Math.random() - 0.5) * 0.35, Math.random() * 0.22, (Math.random() - 0.5) * 0.35);
    puff.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.45, 1.35 + Math.random() * 0.8, (Math.random() - 0.5) * 0.45);
    puff.userData.puff = true;
    group.add(puff);
  }
  addImpactEffect(group, 1.15);
}

function updateBurnVisual(target, dt) {
  const fire = targetFireState(target);
  const group = targetShipGroup(target);
  if (!fire || !group) return;
  if (!fire.scorch) addScorchMark(target);
  if (fire.scorch?.material) {
    const heat = clamp(fire.remaining / 12, 0, 1);
    fire.scorch.material.opacity = 0.62 + heat * 0.24;
  }
  fire.smokeTimer = (fire.smokeTimer || 0) - dt;
  if (fire.smokeTimer <= 0) {
    fire.smokeTimer = 0.16 + Math.random() * 0.14;
    const smokePoint = new THREE.Vector3();
    if (fire.scorch?.parent) fire.scorch.getWorldPosition(smokePoint);
    else smokePoint.copy(group.position).y += 1.25;
    smokePoint.y += 0.38;
    makeBurnSmoke(smokePoint);
  }
}

function igniteTarget(target, fire, hitPosition = null, visualOnly = false) {
  if (!fire) return;
  const current = targetFireState(target);
  const fireDps = Number(fire.dps);
  const effect = {
    dps: Number.isFinite(fireDps) ? fireDps : 2,
    remaining: Number(fire.duration) || 12,
  };
  const next = {
    dps: effect.dps,
    remaining: Math.max(current?.remaining || 0, effect.remaining),
    visualOnly: Boolean(visualOnly) && current?.visualOnly !== false,
    scorch: current?.scorch || null,
    smokeTimer: current?.smokeTimer || 0,
  };
  setTargetFireState(target, next);
  addScorchMark(target, hitPosition);
}

function updateFireDamage(target, dt, speed = 0) {
  const fire = targetFireState(target);
  if (!fire) return;
  const movementWear = 1 + clamp(speed / 32, 0, 0.9);
  fire.remaining -= dt * movementWear;
  updateBurnVisual(target, dt);
  if (!fire.visualOnly) {
    const fireDps = Number(fire.dps);
    const damage = (Number.isFinite(fireDps) ? fireDps : 2) * dt;
    target.hp -= damage;
  }
  if (fire.remaining <= 0) {
    clearBurnVisual(target);
    setTargetFireState(target, null);
  }
  if (!fire.visualOnly && target.hp <= 0) {
    clearBurnVisual(target);
    setTargetFireState(target, null);
    if (target.isBot) {
      damageTarget(target, 0);
    } else {
      damageTarget(state, maxHp() * 4);
    }
  }
}

function animalHitRadius(animal) {
  return animal.kind === "whale" ? 5.2 : 1;
}

function whaleIslandSteer(position, forward, radius, submerged = false, extra = 0) {
  const steer = new THREE.Vector3();
  let active = false;
  islands.forEach((island) => {
    if (island.forge) return;
    const away = position.clone().sub(island.group.position);
    away.y = 0;
    const distance = away.length();
    const danger = island.radius + radius + (submerged ? 18 : 30) + extra;
    if (distance <= 0.001 || distance >= danger) return;
    active = true;
    const pressure = Math.pow((danger - distance) / danger, 1.35);
    const radial = away.normalize();
    const tangent = new THREE.Vector3(radial.z, 0, -radial.x);
    if (tangent.dot(forward) < 0) tangent.multiplyScalar(-1);
    steer.add(radial.multiplyScalar(pressure * (submerged ? 1.05 : 1.75)));
    steer.add(tangent.multiplyScalar(pressure * (submerged ? 1.25 : 1.55)));
  });
  if (!active) return null;
  const blended = forward.clone().multiplyScalar(0.42).add(steer);
  return blended.lengthSq() > 0.001 ? blended.normalize() : forward.clone();
}

function projectileHitsAnimal(shot, animal) {
  if (!animal || animal.hp <= 0 || animal.kind !== "whale") return false;
  if (animal.submergedUntil > clock.elapsedTime && shot.ammoType !== "harpoon") return false;
  const local = animal.group.worldToLocal(shot.mesh.position.clone());
  const lengthHit = 5.65;
  const widthHit = 2.05;
  const heightHit = animal.submergedUntil > clock.elapsedTime ? 1.35 : 2.3;
  const ellipse = (local.x / widthHit) ** 2 + (local.z / lengthHit) ** 2;
  return ellipse <= 1 && local.y > -1.2 && local.y < heightHit;
}

function damageAnimal(animal, shot) {
  if (animal.kind !== "whale") return false;
  const impactDamage = projectileDamageAtImpact(shot);
  const trapped = Number(animal.serverTrappedUntil || 0) > Date.now();
  const serverTrap = Boolean(animal.serverId && multiplayer.serverWorld);
  const damage = shot.ammoType === "harpoon"
    ? CANNONBALL_TYPES.harpoon.whaleDamage * (state.shipType === "whaler" ? 1.5 : 1)
    : impactDamage * (trapped && !serverTrap ? 1 : 0.5);
  if (animal.serverId && multiplayer.serverWorld) {
    animal.aggressiveUntil = clock.elapsedTime + 18;
    animal.submergedUntil = 0;
    makeSplashEffect(animal.group.position);
    sendMultiplayer({ type: "hitWhale", id: animal.serverId, damage, ammoType: shot.ammoType || "basic" });
    return false;
  }
  animal.hp -= damage;
  animal.aggressiveUntil = clock.elapsedTime + 18;
  animal.submergedUntil = 0;
  makeSplashEffect(animal.group.position);
  if (animal.hp > 0) return false;
  const pos = animal.group.position.clone();
  scene.remove(animal.group);
  animals.splice(animals.indexOf(animal), 1);
  const bitCount = 3 + Math.floor(Math.random() * 3);
  if (multiplayer.serverWorld) {
    sendMultiplayer({ type: "spawnWhaleBits", x: pos.x, z: pos.z, count: bitCount });
  } else {
    for (let i = 0; i < bitCount; i++) {
      const angle = (Math.PI * 2 * i) / bitCount + Math.random() * 0.45;
      const radius = 2.2 + Math.random() * 4.4;
      crates.push({
        mesh: makeCrateMesh(pos.x + Math.sin(angle) * radius, pos.z + Math.cos(angle) * radius, "whale"),
        kind: "whale",
        born: clock.elapsedTime,
        heal: 0,
        xp: 0,
        gold: 0,
        blubber: 1,
      });
    }
  }
  toast("Whale down. Blubber bits surfaced.");
  return true;
}

function setWhaleSubmergedVisual(animal, submerged) {
  if (!animal?.group || animal.visualSubmerged === submerged) return;
  animal.visualSubmerged = submerged;
  animal.group.traverse((child) => {
    if (!child.material) return;
    child.material.opacity = submerged ? 0.34 : 1;
    child.material.transparent = submerged;
  });
}

function updateAnimals(dt) {
  animals.slice().forEach((animal) => {
    if (animal.kind !== "whale") return;
    if (animal.serverId && multiplayer.serverWorld) {
      if (animal.serverPosition) animal.group.position.lerp(animal.serverPosition, clamp(dt * 6, 0, 0.28));
      if (Number.isFinite(animal.serverRotation)) {
        animal.group.rotation.y = lerpAngle(animal.group.rotation.y, animal.serverRotation, clamp(dt * 5, 0, 0.24));
        animal.direction = animal.group.rotation.y;
      }
      const submerged = animal.submergedUntil > clock.elapsedTime || animal.serverSubmerged;
      const targetY = submerged ? -1.15 : 0.05 + Math.sin(clock.elapsedTime * 1.3) * 0.12;
      animal.group.position.y += (targetY - animal.group.position.y) * clamp(dt * 2, 0, 0.12);
      setWhaleSubmergedVisual(animal, submerged);
      return;
    }
    if (!pointInWhaleNorthZone(animal.group.position, 80)) {
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 8, WHALE_NORTH_MAX_Z - 8);
      animal.direction = whaleZoneReturnDirection(animal.group.position);
    }
    animal.turnAt -= dt;
    if (animal.turnAt <= 0) {
      animal.turnAt = 3 + Math.random() * 6;
      animal.direction += (Math.random() - 0.5) * 1.2;
      if (Math.random() < 0.28) animal.submergedUntil = clock.elapsedTime + 4 + Math.random() * 5;
    }
    const underIsland = pointInAnyIsland(animal.group.position, animalHitRadius(animal) * 0.65);
    if (underIsland && animal.submergedUntil <= clock.elapsedTime + 0.6) {
      animal.submergedUntil = clock.elapsedTime + 2.4;
    }
    const nearWhaleBoundary = animal.group.position.z < WHALE_NORTH_MIN_Z + 42 || animal.group.position.z > WHALE_NORTH_MAX_Z - 42;
    if ((animal.aggressiveUntil || 0) > clock.elapsedTime && state.mode === "ship" && pointInWhaleNorthZone(playerShip.position, -12)) {
      animal.direction = lerpAngle(
        animal.direction,
        Math.atan2(playerShip.position.x - animal.group.position.x, playerShip.position.z - animal.group.position.z),
        clamp(dt * 2.4, 0, 0.2)
      );
      animal.submergedUntil = 0;
    }
    if (nearWhaleBoundary || !pointInWhaleNorthZone(animal.group.position)) {
      animal.direction = lerpAngle(animal.direction, whaleZoneReturnDirection(animal.group.position), clamp(dt * 3.8, 0, 0.32));
    }
    const submerged = animal.submergedUntil > clock.elapsedTime;
    const desiredForward = new THREE.Vector3(Math.sin(animal.direction), 0, Math.cos(animal.direction));
    const islandSteer = whaleIslandSteer(animal.group.position, desiredForward, animalHitRadius(animal), submerged);
    if (islandSteer) {
      animal.direction = lerpAngle(animal.direction, Math.atan2(islandSteer.x, islandSteer.z), clamp(dt * (submerged ? 1.9 : 3.2), 0, 0.26));
    }
    const targetY = submerged ? -1.15 : 0.05 + Math.sin(clock.elapsedTime * 1.3) * 0.12;
    animal.group.position.y += (targetY - animal.group.position.y) * clamp(dt * 2, 0, 0.12);
    animal.group.rotation.y = lerpAngle(animal.group.rotation.y, animal.direction, clamp(dt * 2, 0, 0.12));
    const forward = new THREE.Vector3(Math.sin(animal.group.rotation.y), 0, Math.cos(animal.group.rotation.y));
    const next = animal.group.position.clone().add(forward.multiplyScalar(animal.speed * dt * (submerged ? 0.82 : (animal.aggressiveUntil || 0) > clock.elapsedTime ? 1.08 : 1)));
    if (animal.bombImpulse?.lengthSq?.() > 0.001) {
      next.add(animal.bombImpulse.clone().multiplyScalar(dt));
      animal.bombImpulse.multiplyScalar(Math.pow(0.14, dt));
    }
    const blockedIsland = islands.find((island) => !island.forge && dist2(next, island.group.position) < island.radius + animalHitRadius(animal) * 0.85);
    if (!pointInWhaleNorthZone(next)) {
      animal.direction = lerpAngle(animal.direction, whaleZoneReturnDirection(animal.group.position), 0.62);
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 2, WHALE_NORTH_MAX_Z - 2);
      return;
    }
    if (Math.abs(next.x) > MAP_LIMIT * 0.94 || Math.abs(next.z) > MAP_LIMIT * 0.94 || blockedIsland) {
      if (blockedIsland) {
        const escape = whaleIslandSteer(animal.group.position, forward, animalHitRadius(animal), submerged, 44);
        if (escape) animal.direction = lerpAngle(animal.direction, Math.atan2(escape.x, escape.z), 0.42);
        const away = animal.group.position.clone().sub(blockedIsland.group.position);
        away.y = 0;
        if (away.lengthSq() > 0.01) animal.group.position.add(away.normalize().multiplyScalar(dt * animal.speed * 0.35));
      } else {
        animal.direction += Math.PI * (0.8 + Math.random() * 0.4);
      }
      animal.group.position.x = clamp(animal.group.position.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
      animal.group.position.z = clamp(animal.group.position.z, WHALE_NORTH_MIN_Z + 2, WHALE_NORTH_MAX_Z - 2);
    } else {
      animal.group.position.copy(next);
    }
    setWhaleSubmergedVisual(animal, submerged);
    animal.ramCooldown = Math.max(0, animal.ramCooldown - dt);
    if (!submerged && state.mode === "ship" && animal.ramCooldown <= 0 && dist2(animal.group.position, playerShip.position) < animalHitRadius(animal) + shipHitRadius(state.shipType) * 0.5) {
      const away = playerShip.position.clone().sub(animal.group.position);
      away.y = 0;
      if (away.lengthSq() < 0.01) away.set(Math.sin(animal.group.rotation.y), 0, Math.cos(animal.group.rotation.y));
      away.normalize();
      const whaleScale = state.shipType === "whaler" ? getShipStats().whaleRamTakenScale || 0.25 : 1;
      damageTarget(state, 50 * whaleScale);
      state.velocity.add(away.multiplyScalar(10));
      animal.submergedUntil = clock.elapsedTime + 5 + Math.random() * 3;
      animal.ramCooldown = 9;
      toast("A whale rammed your ship.");
    }
  });
}

function makeStormCloud() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x34383e, roughness: 1, transparent: false, opacity: 1, depthWrite: true });
  const underMat = new THREE.MeshStandardMaterial({ color: 0x2d3137, roughness: 1, transparent: false, opacity: 1, depthWrite: true });
  const wispMat = new THREE.MeshBasicMaterial({ color: 0x34383e, transparent: false, opacity: 1, depthWrite: true, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 14; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), i < 5 ? underMat : cloudMat);
    puff.scale.set(9 + Math.random() * 9, 1.05 + Math.random() * 1.25, 4.8 + Math.random() * 5.5);
    puff.position.set((Math.random() - 0.5) * 58, Math.random() * 6.6, (Math.random() - 0.5) * 48);
    puff.rotation.set((Math.random() - 0.5) * 0.08, Math.random() * Math.PI, (Math.random() - 0.5) * 0.12);
    group.add(puff);
  }
  for (let i = 0; i < 9; i++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(18 + Math.random() * 20, 2.6 + Math.random() * 2.2), wispMat.clone());
    sheet.material.opacity = 1;
    sheet.position.set((Math.random() - 0.5) * 62, -1.4 + Math.random() * 4, (Math.random() - 0.5) * 54);
    sheet.rotation.set((Math.random() - 0.5) * 0.18, Math.random() * Math.PI, (Math.random() - 0.5) * 0.1);
    group.add(sheet);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x1f2b35, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -47.82;
  shadow.userData.stormShadow = true;
  group.add(shadow);
  group.position.y = 48;
  return group;
}

function spawnStorm() {
  const group = makeStormCloud();
  const northBias = Math.random() < 0.72;
  const x = (Math.random() - 0.5) * MAP_LIMIT * 1.4;
  const z = northBias ? Math.random() * MAP_LIMIT * 0.9 : (Math.random() - 0.5) * MAP_LIMIT * 1.5;
  group.position.x = x;
  group.position.z = z;
  scene.add(group);
  const direction = Math.random() * Math.PI * 2;
  const radius = 58 + Math.random() * 34;
  const shadow = group.children.find((child) => child.userData.stormShadow);
  if (shadow) shadow.scale.setScalar(radius);
  storms.push({
    group,
    radius,
    velocity: new THREE.Vector3(Math.sin(direction), 0, Math.cos(direction)).multiplyScalar(4),
    born: clock.elapsedTime,
    life: 600,
    strikeAt: clock.elapsedTime + 2 + Math.random() * 6,
  });
}

function makeLightningBolt(start, end) {
  const group = new THREE.Group();
  const points = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = start.clone().lerp(end, t);
    p.x += (Math.random() - 0.5) * 3.6 * (1 - Math.abs(t - 0.5));
    p.z += (Math.random() - 0.5) * 3.6 * (1 - Math.abs(t - 0.5));
    points.push(p);
  }
  const main = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.95 })
  );
  group.add(main);
  for (let i = 2; i < points.length - 2; i += 2) {
    const base = points[i];
    const branchEnd = base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, -3 - Math.random() * 5, (Math.random() - 0.5) * 8));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([base, branchEnd]),
      new THREE.LineBasicMaterial({ color: 0x89dfff, transparent: true, opacity: 0.72 })
    ));
  }
  addImpactEffect(group, 0.28);
}

function lightningStrike(storm) {
  const candidates = [];
  if (state.mode === "ship" && dist2(playerShip.position, storm.group.position) < storm.radius) {
    candidates.push({ kind: "player", position: playerShip.position, target: state, type: state.shipType });
  }
  bots.forEach((bot) => {
    if (dist2(bot.group.position, storm.group.position) < storm.radius) {
      candidates.push({ kind: "bot", position: bot.group.position, target: bot, type: bot.shipType });
    }
  });
  balloons.forEach((balloon) => {
    if (!balloon.destroyed && dist2(balloon.group.position, storm.group.position) < storm.radius) {
      candidates.push({ kind: "balloon", position: balloon.group.position, target: balloon });
    }
  });
  islands.forEach((island) => {
    if (dist2(island.group.position, storm.group.position) < storm.radius + island.radius) {
      const angle = Math.random() * Math.PI * 2;
      candidates.push({
        kind: "island",
        position: island.group.position.clone().add(new THREE.Vector3(Math.sin(angle) * island.radius * 0.45, 0, Math.cos(angle) * island.radius * 0.45)),
      });
    }
  });
  if (!candidates.length) return;
  const hit = candidates[Math.floor(Math.random() * candidates.length)];
  const start = new THREE.Vector3(hit.position.x, storm.group.position.y + 6, hit.position.z);
  const end = hit.position.clone().setY(0.6);
  makeLightningBolt(start, end);
  makeFireImpactEffect(end.clone(), new THREE.Vector3(1, 0, 0));
  if (hit.kind === "player" || hit.kind === "bot") {
    damageTarget(hit.target, 50, { fire: { dps: 10, duration: 3 }, hitPosition: end });
  } else if (hit.kind === "balloon") {
    destroyBalloon(hit.target, "lightning");
  }
}

function showServerLightning(x, z) {
  const point = new THREE.Vector3(Number(x) || 0, 0.6, Number(z) || 0);
  makeLightningBolt(point.clone().setY(58), point);
  makeFireImpactEffect(point.clone(), new THREE.Vector3(1, 0, 0));
}

function updateStorms(dt) {
  if (multiplayer.serverWorld) {
    storms.slice().forEach((storm) => {
      if (storm.serverPosition) storm.group.position.lerp(storm.serverPosition, clamp(dt * 3.5, 0, 0.2));
      storm.group.rotation.y += dt * 0.04;
    });
    return;
  }
  if (clock.elapsedTime >= nextStormAt) {
    nextStormAt = clock.elapsedTime + 130 + Math.random() * 220;
    if (Math.random() < 0.65) spawnStorm();
  }
  storms.slice().forEach((storm) => {
    storm.group.position.add(storm.velocity.clone().multiplyScalar(dt));
    storm.group.rotation.y += dt * 0.04;
    if (clock.elapsedTime >= storm.strikeAt) {
      storm.strikeAt = clock.elapsedTime + 3 + Math.random() * 7;
      lightningStrike(storm);
    }
    if (clock.elapsedTime - storm.born > storm.life) {
      scene.remove(storm.group);
      storms.splice(storms.indexOf(storm), 1);
    }
  });
}

function damageTarget(target, amount, options = {}) {
  if (target.serverId && multiplayer.serverWorld) {
    sendMultiplayer({ type: "hitBot", id: target.serverId, damage: amount, fire: options.fire || null });
    return;
  }
  const armor = options.ignoreArmor ? 0 : target.isBot ? getShipStats(target.shipType).armor : getShipStats().armor;
  target.hp -= amount * (1 - armor);
  if (target.hp > 0 && options.fire) igniteTarget(target, options.fire, options.hitPosition || null);
  if (target.isBot && target.hp > 0) alertBot(target);
  if (target.hp <= 0) {
    const level = target.level || 1;
    const deathPos = target.isBot ? target.group.position : playerShip.position;
    if (target.isBot) {
      clearBurnVisual(target);
      target.fire = null;
      dropCrates(deathPos, crateDropCount(target) + tortugaBonusCrateCount(state.shipType));
      target.hp = getShipStats(target.shipType).hp;
      target.group.position.copy(randomWaterPoint(MAP_LIMIT * 0.9, 82));
      target.level = Math.max(1, target.level + (Math.random() > 0.55 ? 1 : 0));
      target.agroUntil = 0;
      target.fireCooldown = 1.8 + Math.random() * 2;
      state.gold += 45 + level * 12;
      addXP(40 + level * 22);
      toast(`Sank a level ${level} ship. Crates overboard!`);
    } else {
      dropPlayerDeathCrates(deathPos);
      clearBuildInventory(false);
      const lostGold = Math.floor(state.gold * 0.25);
      state.gold = Math.max(0, state.gold - lostGold);
      clearBurnVisual(state);
      state.fire = null;
      state.leviathanGrabbed = false;
      state.fallingOffWorld = false;
      state.fallingTimer = 0;
      state.fallVelocityY = 0;
      state.fallDrift.set(0, 0, 0);
      state.fallSpin.set(0, 0, 0);
      state.viewMode = "ship";
      state.activeBalloonIndex = -1;
      resetCharacterHealth();
      closeShop();
      state.velocity.set(0, 0, 0);
      const rescueShip = bestLivingFleetShip();
      if (rescueShip) {
        const rescueIsland = islands.find((island) => island.name === rescueShip.dockedAt);
        const rescuePosition = rescueShip.group.position.clone();
        const rescueRotation = rescueShip.group.rotation.y;
        const rescueHp = rescueShip.hp;
        const rescueType = rescueShip.type;
        removeOwnedShip(rescueShip);
        replacePlayerShip(rescueType, rescuePosition, { hp: rescueHp, rotation: rescueRotation });
        target.mode = rescueIsland ? "land" : "ship";
        target.dockedAt = rescueIsland?.name || null;
        if (rescueIsland) {
          const landing = landingPointForShip(rescueIsland, playerShip.position);
          character.position.copy(landing.point);
          character.position.y = landing.y + 0.05;
          character.visible = true;
          state.walkingPos.copy(character.position);
        } else {
          character.visible = false;
        }
        toast(`Your ship was sunk. You lost ${lostGold}g and returned to your ${shipName(rescueType)}.`);
      } else {
        target.mode = "ship";
        target.dockedAt = null;
        character.visible = false;
        target.position.set(-15, 0, -12);
        replacePlayerShip(STARTER_SHIP, target.position);
        toast(`Your ship was sunk. You lost ${lostGold}g and restarted in a Skiff.`);
      }
    }
  }
}

function initWorld() {
  addLights();
  applyGraphicsQuality({ resize: true });
  addSea();
  initCompassTrail();
  initWindCurrents();
  for (let i = 0; i < 20; i++) makeCloud();
  islandData.forEach((data) => islands.push(makeIsland(data)));
  playerShip = makeShip(state.shipType);
  playerShip.position.copy(state.position);
  playerShip.position.y = SHIP_WATERLINE_Y;
  scene.add(playerShip);
  character = makeCharacter();
  for (let i = 0; i < STARTING_FISH_COUNT; i++) makeFish();
  for (let i = 0; i < STARTING_SQUID_COUNT; i++) makeSquid();
  for (let i = 0; i < 7; i++) makeWhale();
  const botSpawnCatalog = shipCatalog.filter((ship) => !BOT_BLOCKED_SHIP_IDS.has(ship.id));
  for (let i = 0; i < 15; i++) {
    const spec = botSpawnCatalog[1 + Math.floor(Math.random() * Math.max(1, botSpawnCatalog.length - 1))];
    const group = makeShip(spec.id, true);
    const spawn = randomWaterPoint(MAP_LIMIT * 0.9, 96);
    group.position.copy(spawn);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
    bots.push({
      localId: `bot-${i}`,
      isBot: true,
      group,
      shipType: spec.id,
      hp: spec.hp,
      level: 1 + Math.floor(Math.random() * 7),
      turn: Math.random() * 10,
      velocity: new THREE.Vector3(),
      rotation: group.rotation.y,
      agroUntil: 0,
      naturallyAggressive: Math.random() < 0.24,
      courageous: Math.random() < 1 / 3,
      upgradeFocus: ["damage", "reload", "range"][i % 3],
      targetBot: null,
      botFightUntil: 0,
      fireCooldown: 1.6 + Math.random() * 2.4,
    });
  }
}

function setTool(tool) {
  state.tool = tool;
  if (tool !== "glass" && state.spyTarget) {
    state.spyTarget = null;
    updateSpyPanel();
  }
  Object.entries(ui.toolButtons).forEach(([name, button]) => button.classList.toggle("active", name === tool));
}

ui.toolButtons.cannon.addEventListener("click", () => setTool("cannon"));
ui.toolButtons.rod.addEventListener("click", () => setTool("rod"));
ui.toolButtons.glass.addEventListener("click", () => setTool("glass"));
[ui.languageSelect, ui.hudLanguageSelect, ui.settingsLanguageSelect].forEach((select) => {
  select?.addEventListener("change", () => setLanguage(select.value));
});
ui.graphicsSelect?.addEventListener("change", () => setGraphicsQuality(ui.graphicsSelect.value));
ui.settingsButton?.addEventListener("click", (event) => {
  event.preventDefault();
  ui.settingsPanel?.classList.toggle("hidden");
});
ui.settingsClose?.addEventListener("click", () => ui.settingsPanel?.classList.add("hidden"));
ui.settingsPanel?.addEventListener("pointerdown", (event) => event.stopPropagation());
ui.guideYes?.addEventListener("click", () => showBeginnerGuide());
ui.guideNo?.addEventListener("click", () => closeBeginnerGuide());
ui.guideClose?.addEventListener("click", () => closeBeginnerGuide());
ui.ammoHotbar?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ammo-slot]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (selectAmmoSlot(button.dataset.ammoSlot, true)) setTool("cannon");
});
ui.ammoHotbar?.addEventListener("mousedown", (event) => {
  if (!event.target.closest("[data-ammo-slot]")) return;
  event.preventDefault();
  event.stopPropagation();
});
ui.closeShop.addEventListener("click", () => closeShop());
ui.dockPrompt.addEventListener("click", () => {
  if (nameGateOpen()) return;
  if (state.viewMode === "swim") {
    startForgeWaterfallTransit("up");
    return;
  }
  if (state.mode === "land" && state.dockedAt === "Forge") {
    startForgeWaterfallTransit("down");
    return;
  }
  if (state.mode === "land") {
    setSail();
    return;
  }
  const island = currentIsland();
  if (island) startDocking(island);
});
ui.closeMinimap.addEventListener("click", () => {
  ui.minimapPanel.classList.add("hidden");
  ui.minimapPanel.classList.remove("expanded");
  ui.openMinimap.classList.remove("hidden");
});
ui.openMinimap.addEventListener("click", () => {
  ui.minimapPanel.classList.remove("hidden");
  ui.minimapPanel.classList.remove("expanded");
  ui.openMinimap.classList.add("hidden");
});
ui.minimap?.addEventListener("click", (event) => {
  handleGoldDiggerMinimapTeleport(event);
});
ui.toggleWindMap?.addEventListener("click", () => {
  state.showWindMarkers = !state.showWindMarkers;
  saveValue("islandwakeWindMarkers", state.showWindMarkers ? "1" : "0");
  toast(state.showWindMarkers ? "Wind markers shown." : "Wind markers hidden.");
});
ui.closeLeaderboard?.addEventListener("click", () => {
  ui.leaderboardPanel.classList.add("hidden");
  ui.openLeaderboard.classList.remove("hidden");
});
ui.openLeaderboard?.addEventListener("click", () => {
  ui.leaderboardPanel.classList.remove("hidden");
  ui.openLeaderboard.classList.add("hidden");
  renderLeaderboard();
});
ui.closeInventory?.addEventListener("click", () => setInventoryOpen(false));
ui.closeForge?.addEventListener("click", () => closeForgePanel());
ui.forgeBody?.addEventListener("pointerdown", handleForgeBodyAction);
ui.forgeBody?.addEventListener("click", handleForgeBodyAction);
function handleInventoryBodyAction(event) {
  const button = event.target.closest("[data-build-select]");
  if (!button) return;
  const now = performance.now();
  if (event.type === "click" && now - lastInventoryPointerHandledAt < 450) return;
  if (event.type === "pointerdown") lastInventoryPointerHandledAt = now;
  event.preventDefault();
  event.stopPropagation();
  if (button.disabled) return;
  const type = button.dataset.buildSelect;
  if (!BUILD_ITEMS[type] || buildInventoryCount(type) <= 0) return;
  state.selectedBuildItem = state.selectedBuildItem === type ? null : type;
  renderInventory();
}
ui.inventoryBody?.addEventListener("pointerdown", handleInventoryBodyAction);
ui.inventoryBody?.addEventListener("click", handleInventoryBodyAction);
ui.tabs.forEach((tab) => tab.addEventListener("click", () => {
  state.shopTab = tab.dataset.tab;
  ui.tabs.forEach((item) => item.classList.toggle("active", item === tab));
  renderShop();
}));

function setupNameGate() {
  if (!ui.nameGate || !ui.nameForm || !ui.nameInput) return;
  const sendHello = () => {
    const hello = { type: "hello", player: multiplayerPayload(), account: accountPayload() };
    const progress = accountProgressSnapshot({ accountSave: true });
    if (progress) hello.progress = progress;
    sendMultiplayer(hello);
  };
  const joinGame = (event = null, forcedName = "", forcedToken = "", forcedAccount = "", forcedPassword = "", forcedAccountMode = "", forcedGoogleAccount = null, forcedAutoName = false) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (ui.nameGate.classList.contains("hidden")) return;
    if (forcedName) ui.nameInput.value = forcedName;
    if (forcedToken && ui.developerTokenInput) ui.developerTokenInput.value = forcedToken;
    if (forcedAccount && ui.accountNameInput) ui.accountNameInput.value = forcedAccount;
    if (forcedPassword && ui.accountPasswordInput) ui.accountPasswordInput.value = forcedPassword;
    if (forcedAccountMode && ui.accountModeInput) setAccountMode(forcedAccountMode);
    if (forcedGoogleAccount?.credential) {
      state.googleAccount = forcedGoogleAccount;
      if (ui.accountNameInput) ui.accountNameInput.value = forcedGoogleAccount.email || forcedGoogleAccount.name || "";
      if (ui.accountPasswordInput) ui.accountPasswordInput.value = "";
    }
    const nextName = ui.nameInput.value.trim().replace(/\s+/g, " ").slice(0, 18);
    const token = ui.developerTokenInput?.value?.trim() || "";
    const accountName = ui.accountNameInput?.value?.trim().replace(/\s+/g, " ").slice(0, 24) || "";
    const accountPassword = ui.accountPasswordInput?.value || "";
    const rawAccountMode = ui.accountModeInput?.value || state.accountMode || "";
    const googleAccount = state.googleAccount?.credential && (rawAccountMode === "create" || rawAccountMode === "signin") ? state.googleAccount : null;
    const accountMode = googleAccount ? (rawAccountMode || "signin") : accountName && accountPassword ? (rawAccountMode || "signin") : "";
    const autoGeneratedName = Boolean(forcedAutoName) || !nextName;
    const resolvedName = nextName || randomCaptainName();
    if ((rawAccountMode === "create" || rawAccountMode === "signin") && !googleAccount && (!accountName || !accountPassword)) {
      setAccountMode(rawAccountMode, "Enter an account name and password.");
      if (!accountName) ui.accountNameInput?.focus();
      else ui.accountPasswordInput?.focus();
      return;
    }
    state.name = resolvedName;
    state.autoGeneratedName = autoGeneratedName;
    state.devToken = token;
    state.accountName = googleAccount ? (googleAccount.email || googleAccount.name || accountName) : accountName;
    state.accountPassword = googleAccount ? "" : accountPassword;
    state.accountMode = accountMode === "create" ? "create" : accountMode === "signin" ? "signin" : "";
    if (googleAccount) state.googleAccount = { ...googleAccount, mode: state.accountMode };
    else state.googleAccount = null;
    state.accountAuthed = false;
    state.infiniteGold = token.toLowerCase() === "golddigger";
    state.infiniteLevels = token.toLowerCase() === "golddigger";
    if (state.infiniteGold) state.gold = 999999999;
    if (state.infiniteLevels) {
      state.level = Math.max(state.level, 999999);
      state.points = Math.max(state.points, 999999);
      state.xp = 0;
    }
    state.joined = true;
    if (state.accountName) saveValue("islandwakeAccount", state.accountName);
    if (state.accountMode) setAccountMode(state.accountMode, hasGoldDiggerPowers() ? "Contacting account server. GoldDigger progress will not save." : "Contacting account server...");
    ui.nameGate.classList.add("hidden");
    setMenuScreen(false);
    sendHello();
    updateHud();
    showBeginnerQuestion();
  };
  const joinWithGoogleCredential = (response, forcedMode = "") => {
    const credential = String(response?.credential || "");
    const accessToken = String(response?.accessToken || response?.access_token || "");
    const mode = forcedMode === "create" || forcedMode === "signin" ? forcedMode : state.accountMode === "create" ? "create" : "signin";
    if (response?.error) {
      setAccountMode(mode, "Google sign-in was cancelled or blocked.");
      return;
    }
    if (!credential && !accessToken) {
      setAccountMode(mode, "Google did not return a sign-in token.");
      return;
    }
    let payload = {};
    if (credential) {
      try {
        payload = decodeGoogleJwtPayload(credential);
      } catch {
        setAccountMode(mode, "Google account details could not be read.");
        return;
      }
    }
    const name = googleNameFromPayload(payload);
    const email = String(payload.email || "").trim();
    const googleAccount = { provider: "google", credential, accessToken, name, email, mode };
    state.googleAccount = googleAccount;
    if (ui.nameInput && !ui.nameInput.value.trim()) ui.nameInput.value = name.slice(0, 18);
    if (ui.accountNameInput) ui.accountNameInput.value = email || name;
    if (ui.accountPasswordInput) ui.accountPasswordInput.value = "";
    setAccountMode(mode, "Checking Google account...");
    joinGame(null, ui.nameInput?.value || name, "", email || name, "", mode, googleAccount, false);
  };
  googleCredentialHandler = joinWithGoogleCredential;
  window.islandwakeJoin = (name = "", token = "", account = "", password = "", accountMode = "", autoName = false) => joinGame(null, String(name || ""), String(token || ""), String(account || ""), String(password || ""), String(accountMode || ""), null, Boolean(autoName));
  window.islandwakeJoinGoogle = (credential = "", accountMode = "") => joinWithGoogleCredential({ credential: String(credential || "") }, String(accountMode || ""));
  ui.nameInput.value = state.name;
  if (ui.accountNameInput) ui.accountNameInput.value = state.accountName;
  setAccountMode("");
  ui.nameGate.classList.remove("hidden");
  setMenuScreen(true);
  setTimeout(() => {
    ui.nameInput.focus();
    ui.nameInput.select();
  }, 100);
  ui.playerName.style.cursor = "pointer";
  ui.playerName.title = t("captainName");
  ui.playerName.addEventListener("click", () => {
    ui.nameInput.value = state.name;
    ui.nameGate.classList.remove("hidden");
    setMenuScreen(true);
    ui.nameInput.focus();
    ui.nameInput.select();
  });
  ui.nameButton?.addEventListener("click", joinGame);
  ui.nameForm.addEventListener("submit", joinGame);
  ui.nameGate.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#setSailButton, #accountSubmit");
    if (!button) return;
    joinGame(event);
  }, true);
  ui.accountOpenButtons?.forEach?.((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const mode = button.dataset.accountOpen || "signin";
      setAccountMode(mode);
      if (!ui.accountNameInput?.value?.trim()) ui.accountNameInput?.focus();
      else if (!ui.accountPasswordInput?.value) ui.accountPasswordInput?.focus();
    });
  });
  ui.googleAccountButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startGoogleAccountPrompt();
  });
  ui.accountClose?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAccountMode("");
    ui.nameInput?.focus();
  });
  ui.nameInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  ui.developerTokenInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  ui.accountNameInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  ui.accountNameInput?.addEventListener("input", () => {
    state.googleAccount = null;
  });
  ui.accountPasswordInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    joinGame(event);
  });
  ui.accountPasswordInput?.addEventListener("input", () => {
    state.googleAccount = null;
  });
  if (window.ISLANDWAKE_PENDING_JOIN) {
    joinGame(null, String(window.ISLANDWAKE_PENDING_JOIN), String(window.ISLANDWAKE_PENDING_TOKEN || ""), String(window.ISLANDWAKE_PENDING_ACCOUNT || ""), String(window.ISLANDWAKE_PENDING_PASSWORD || ""), String(window.ISLANDWAKE_PENDING_ACCOUNT_MODE || ""), null, Boolean(window.ISLANDWAKE_PENDING_AUTO_NAME));
    window.ISLANDWAKE_PENDING_JOIN = "";
    window.ISLANDWAKE_PENDING_AUTO_NAME = false;
    window.ISLANDWAKE_PENDING_TOKEN = "";
    window.ISLANDWAKE_PENDING_ACCOUNT = "";
    window.ISLANDWAKE_PENDING_PASSWORD = "";
    window.ISLANDWAKE_PENDING_ACCOUNT_MODE = "";
  }
}

addEventListener("keydown", (event) => {
  if (nameGateOpen()) return;
  const key = event.key.toLowerCase();
  const code = event.code?.toLowerCase?.() || "";
  if ((key === "t" || code === "keyt") && state.viewMode === "swim") {
    event.preventDefault();
    startForgeWaterfallTransit("up");
    return;
  }
  if ((key === "t" || code === "keyt") && state.mode === "land" && state.dockedAt === "Forge") {
    event.preventDefault();
    startForgeWaterfallTransit("down");
    return;
  }
  if ((key === "t" || code === "keyt") && state.mode === "ship") {
    const island = currentIsland();
    if (island) {
      event.preventDefault();
      startDocking(island);
    } else {
      toast("Get closer to an island to dock.");
    }
    return;
  }
  if ((key === "c" || code === "keyc") && state.mode === "land") {
    event.preventDefault();
    if (state.dockedAt === "Forge") {
      toast("Use the waterfall to leave the Forge.");
      return;
    }
    setSail();
    return;
  }
  if ((key === "c" || code === "keyc") && (state.viewMode === "deck" || state.viewMode === "swim")) {
    event.preventDefault();
    exitDeckMode();
    return;
  }
  if (key === "f") {
    event.preventDefault();
    if (state.dockedAt === "Forge" && state.mode === "land") {
      toast("Use the waterfall to leave the Forge.");
      return;
    }
    if (state.viewMode === "deck" || state.viewMode === "swim") returnCharacterToShipDeck();
    else enterDeckMode();
    return;
  }
  if (key === "i" || code === "keyi") {
    event.preventDefault();
    setInventoryOpen(!state.inventoryOpen);
    return;
  }
  if ((key === "r" || code === "keyr") && state.mode === "land") {
    event.preventDefault();
    if (state.dockedAt === "Forge") {
      openForgePanel();
      return;
    }
    if (openForgePanel()) return;
    openIslandShop();
    return;
  }
  if ((key === " " || key === "spacebar") && state.mode === "land" && state.grounded) {
    event.preventDefault();
    state.walkVelocityY = 12;
    state.grounded = false;
    return;
  }
  if ((key === " " || key === "spacebar") && state.viewMode === "deck" && state.grounded) {
    event.preventDefault();
    state.walkVelocityY = 9;
    state.grounded = false;
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    state.cameraYaw += 0.38;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    state.cameraYaw -= 0.38;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.cameraPitch = clamp(state.cameraPitch + 0.08, -0.18, 0.92);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.cameraPitch = clamp(state.cameraPitch - 0.08, -0.18, 0.92);
  }
  if (key === "g") {
    event.preventDefault();
    setTool("glass");
    inspectWithSpyglass();
    return;
  }
  if (key === "x" && state.fishing) {
    event.preventDefault();
    clearFishingRig();
    state.fishing = null;
    state.rodCooldownUntil = timerDeadline(0.35);
    state.rodCooldown = timerRemainingSeconds(state.rodCooldownUntil);
    toast("Line retracted.");
    return;
  }
  if (key === "n") {
    event.preventDefault();
    if (state.mode !== "ship" || state.viewMode !== "ship") return toast("Ship abilities can only be used while sailing.");
    if (state.shipType === "whaler") {
      state.whalerNets = !state.whalerNets;
      toast(state.whalerNets ? "Whaler nets extended. Speed reduced." : "Whaler nets retracted.");
      return;
    }
    if (state.shipType === "turtle") {
      startTurtleFireAbility();
      return;
    }
    if (state.shipType === "rocketeer") {
      startRocketeerBurstAbility();
      return;
    }
    toast("Only the Whaler, Turtle Ship, and Rocketeer use the N ability.");
    return;
  }
  if (key === "b") {
    event.preventDefault();
    launchBalloon();
    return;
  }
  if (key === "v") {
    event.preventDefault();
    if (switchToNextDockedFleetShip()) return;
    cycleViewMode();
    return;
  }
  if (key === "l") {
    event.preventDefault();
    landActiveBalloon();
    return;
  }
  if (key === " ") {
    event.preventDefault();
  }
  keys.add(key);
  if (event.key === "1") setTool("cannon");
  if (event.key === "2") setTool("rod");
  if (event.key === "3") {
    setTool("glass");
    inspectWithSpyglass();
  }
});
addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});
function handleCanvasToolPointer(event) {
  if (event.target !== canvas || event.button > 0) return;
  const now = performance.now();
  if (now - lastCanvasToolUseAt < 80) return;
  lastCanvasToolUseAt = now;
  event.preventDefault();
  useTool();
}
canvas.addEventListener("pointerdown", handleCanvasToolPointer);
addEventListener("mousedown", handleCanvasToolPointer);

function currentIsland() {
  const pos = state.mode === "ship" ? playerShip.position : character.position;
  if (state.mode === "land" && state.dockedAt) {
    return islands.find((island) => island.name === state.dockedAt);
  }
  return islands.find((island) => {
    if (state.mode === "ship" && island.forge) return false;
    return islandDockContains(island, pos);
  });
}

function startDocking(island) {
  if (!island || state.mode !== "ship") return;
  if (island.forge) return toast("The Forge has no dock. Swim into its waterfall in first person.");
  if (state.docking?.island === island.name) return;
  state.docking = { island: island.name, remaining: 5, endAt: timerDeadline(5) };
  state.velocity.multiplyScalar(0.25);
  toast(`Docking at ${islandName(island)}: 5 seconds.`);
}

function updateDocking(dt) {
  if (!state.docking || state.mode !== "ship") return;
  const island = islands.find((item) => item.name === state.docking.island);
  if (!island || currentIsland() !== island) {
    state.docking = null;
    toast("Docking cancelled. Stay close to the island.");
    return;
  }
  state.velocity.multiplyScalar(Math.pow(0.58, dt * 6));
  if (!state.docking.endAt && state.docking.remaining > 0) state.docking.endAt = timerDeadline(state.docking.remaining);
  state.docking.remaining = timerRemainingSeconds(state.docking.endAt);
  if (state.docking.remaining <= 0) {
    state.docking = null;
    dockAtIsland(island);
  }
}

function dockAtIsland(island) {
  if (!island) return;
  state.docking = null;
  state.mode = "land";
  state.viewMode = "ship";
  state.dockedAt = island.name;
  resetCharacterHealth();
  const landing = landingPointForShip(island, playerShip.position);
  state.walkingPos.copy(landing.point);
  character.position.copy(state.walkingPos);
  character.position.y = landing.y;
  character.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = true;
  playerShip.position.y = SHIP_WATERLINE_Y;
  state.velocity.set(0, 0, 0);
  closeShop();
  playSound("dock", playerShip.position);
  toast(`Docked at ${islandName(island)}. Press R for the market or C to set sail.`);
  updateHud();
}

function setSail() {
  if (state.mode !== "land") return;
  if (state.dockedAt === "Forge") return toast("Use the waterfall to leave the Forge.");
  const island = islands.find((item) => item.name === state.dockedAt) || currentIsland();
  closeShop();
  ["w", "a", "s", "d", "c"].forEach((key) => keys.delete(key));
  if (island) {
    const away = playerShip.position.clone().sub(island.group.position);
    away.y = 0;
    if (away.lengthSq() < 0.001) {
      away.set(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
    }
    away.normalize();
    const minDistance = island.radius + shipHitRadius(state.shipType) + 2.5;
    if (dist2(playerShip.position, island.group.position) < minDistance) {
      playerShip.position.x = island.group.position.x + away.x * minDistance;
      playerShip.position.z = island.group.position.z + away.z * minDistance;
    }
  }
  state.mode = "ship";
  state.viewMode = "ship";
  state.dockedAt = null;
  resetCharacterHealth();
  character.visible = false;
  playerShip.visible = true;
  state.walkHeight = 0;
  state.walkVelocityY = 0;
  state.grounded = false;
  state.velocity.set(0, 0, 0);
  state.position.copy(playerShip.position);
  state.position.y = SHIP_WATERLINE_Y;
  playerShip.position.y = SHIP_WATERLINE_Y;
  multiplayer.lastSent = 0;
  playSound("sail", playerShip.position);
  toast("Sails raised.");
  updateHud();
}

function openIslandShop() {
  if (state.mode !== "land") return toast("Dock at an island before shopping.");
  const island = islands.find((item) => item.name === state.dockedAt) || currentIsland();
  if (!island) return toast("Dock at an island before shopping.");
  if (island.forge) return toast("Stand near the pedestal and press R to open the forge.");
  openShop(island);
}

function fireBroadsideVolley({
  owner,
  ship,
  shipType,
  sides = [-1, 1],
  ammo = CANNONBALL_TYPES.basic,
  range = BOT_CANNON_RANGE,
  baseDamage = 34,
  targetKind = "any",
  targetPoint = null,
  publish = false,
} = {}) {
  if (!ship) return 0;
  const slots = broadsideGunSlots(ship, shipType, sides);
  let fired = 0;
  slots.forEach((slot) => {
    const pellets = ammo.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = pellets > 1 || ammo.spread ? (Math.random() - 0.5) * (ammo.spread || 0) : 0;
      const shotDir = rotateFlatDirection(slot.dir, spread).normalize();
      const maxShotRange = range * (ammo.rangeScale || 1);
      let shotRange = maxShotRange;
      if (targetPoint) {
        const toTarget = targetPoint.clone().sub(slot.origin);
        toTarget.y = 0;
        const aimed = toTarget.dot(shotDir);
        shotRange = clamp(aimed > 0.01 ? aimed : toTarget.length(), 4, maxShotRange);
      }
      const directDamage = Number.isFinite(ammo.fixedDamage) ? ammo.fixedDamage : baseDamage * (ammo.damageScale || 1);
      const target = slot.origin.clone().add(shotDir.clone().multiplyScalar(shotRange));
      target.y = 0;
      makeProjectile(owner, slot.origin, shotDir, directDamage, shotRange, {
        target,
        ammoType: ammo.id,
        targetKind,
        ballistic: !ammo.airburst,
        startY: slot.origin.y,
        baseDamage: directDamage,
        rangeDamage: !ammo.noRangeDamage,
      });
      if (publish) publishShot(slot.origin, shotDir, directDamage, shotRange, target, ammo.id, {
        ballistic: !ammo.airburst,
        startY: slot.origin.y,
        baseDamage: directDamage,
        rangeDamage: !ammo.noRangeDamage,
        targetKind,
      });
      fired++;
    }
  });
  return fired;
}

function useTool() {
  if (nameGateOpen()) return;
  if (ui.shop.classList.contains("hidden") === false) return;
  clearAllShipVisualRock();
  syncActionCooldowns();
  if (state.viewMode === "balloon") {
    dropBalloonBomb(activeBalloon());
    return;
  }
  if (state.viewMode === "deck" || state.viewMode === "swim") return;
  if (state.mode !== "ship") return;
  raycaster.setFromCamera(mouse, camera);
  const aimed = raycaster.ray.intersectPlane(aimPlane, aimPoint);
  if (!aimed) aimPoint.copy(playerShip.position).add(new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation)).multiplyScalar(cannonRange()));
  const dir = aimPoint.clone().sub(playerShip.position);
  dir.y = 0;
  const aimDistance = dir.length();
  if (dir.lengthSq() < 0.1 && state.tool !== "cannon") return;
  dir.normalize();
  if (state.tool === "cannon") {
    const fireDelay = cannonReload();
    state.cooldown = timerRemainingSeconds(state.cooldownUntil);
    if (state.cooldown > 0) return;
    const ammo = normalizeSelectedAmmoForFire();
    const slots = broadsideGunSlots(playerShip, state.shipType, [-1, 1]);
    if (!slots.length) return toast("No cannons are ready on this ship.");
    if (!ammo.infinite && ammoCount(ammo.id) <= 0) {
      state.selectedAmmoSlot = 0;
      state.selectedAmmo = "basic";
      updateAmmoHotbar();
    }
    const firingAmmo = !ammo.infinite && ammoCount(ammo.id) <= 0 ? CANNONBALL_TYPES.basic : ammo;
    const range = clamp(aimDistance, 4, cannonRange());
    const fired = fireBroadsideVolley({
      owner: playerId,
      ship: playerShip,
      shipType: state.shipType,
      sides: [-1, 1],
      ammo: firingAmmo,
      range,
      baseDamage: cannonDamage(),
      targetKind: "any",
      publish: true,
    });
    if (fired > 0) {
      consumeAmmo(firingAmmo);
      state.cooldownUntil = timerDeadline(fireDelay);
      state.cooldown = timerRemainingSeconds(state.cooldownUntil);
    }
  } else if (state.tool === "rod") {
    state.rodCooldown = timerRemainingSeconds(state.rodCooldownUntil);
    if (state.rodCooldown > 0) return;
    state.rodCooldownUntil = timerDeadline(1.1);
    state.rodCooldown = timerRemainingSeconds(state.rodCooldownUntil);
    let best = null;
    let bestDist = 17;
    crates.forEach((crate) => {
      const toCrate = crate.mesh.position.clone().sub(playerShip.position);
      const d = dist2(playerShip.position, crate.mesh.position);
      const alignment = dir.dot(toCrate.normalize());
      if (d < bestDist && alignment > 0.35) {
        best = crate;
        bestDist = d;
      }
    });
    if (best) {
      collectCrate(best);
    } else {
      startFishing(dir);
    }
  } else if (state.tool === "glass") {
    inspectWithSpyglass(dir, true);
  }
}

function collectCrate(crate) {
  if (crate.serverId && multiplayer.serverWorld) {
    if (crate.pending) return;
    if (crate.kind === "whale" && !canAddBlubber(Math.max(1, Math.floor(Number(crate.blubber) || 1)))) {
      return toast(state.shipType === "whaler" ? "Your blubber hold is full." : "Your hold is full.");
    }
    crate.pending = true;
    sendMultiplayer({ type: "collectCrate", id: crate.serverId });
    return;
  }
  if (crate.kind === "whale") {
    const amount = Math.max(1, Math.floor(Number(crate.blubber) || 1));
    if (!canAddBlubber(amount)) return toast(state.shipType === "whaler" ? "Your blubber hold is full." : "Your hold is full.");
    state.cargo["Whale Blubber"] = blubberCount() + amount;
    removeCrate(crate);
    playSound("pickup", crate.mesh?.position || playerShip.position);
    toast("Recovered whale blubber.");
    return;
  }
  state.hp = clamp(state.hp + crate.heal, 0, maxHp());
  addXP(crate.xp);
  state.gold += crate.gold ?? (10 + Math.floor(Math.random() * 26));
  const kind = crate.kind === "kraken" ? "Kraken tentacle" : crate.kind === "treasure" ? "Treasure" : "Crate";
  removeCrate(crate);
  playSound("pickup", playerShip.position);
  toast(`${kind} recovered: repairs, gold, and XP.`);
}

function botCollectCrates(bot) {
  if (multiplayer.serverWorld || !bot?.group || !crates.length) return;
  const spec = getShipStats(bot.shipType);
  const pickupRadius = shipHitRadius(bot.shipType) + 1.15;
  crates.slice().forEach((crate) => {
    if (dist2(bot.group.position, crate.mesh.position) > pickupRadius) return;
    bot.hp = clamp((Number(bot.hp) || spec.hp) + (Number(crate.heal) || 0), 0, bot.serverMaxHp || spec.hp);
    if (crate.kind === "treasure" || crate.kind === "kraken") {
      bot.level = Math.min(40, (bot.level || 1) + 2);
      bot.fireCooldown = Math.min(bot.fireCooldown || 1.5, 1.1);
    }
    removeCrate(crate);
  });
}

function inspectWithSpyglass(dir = null, requireShipHit = false) {
  if (state.mode !== "ship") return toast("Use the spyglass from your ship.");
  if (!dir) {
    dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) dir.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
    dir.normalize();
  }
  const candidates = [
    ...bots.map((bot) => {
      const spec = getShipStats(bot.shipType);
      const hp = Number(bot.hp);
      return { kind: "Hostile", spyKind: "bot", spyId: bot.serverId || bot.localId || String(bot.group.id), name: shipName(bot.shipType), level: bot.level, hp: Number.isFinite(hp) ? hp : spec.hp, max: bot.serverMaxHp || spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: bot.group.position, shipPos: bot.group.position, shipType: bot.shipType, group: bot.group };
    }),
    ...[...remotePlayers.entries()].map(([id, p]) => {
      const spec = getShipStats(p.shipType);
      const hp = Number(p.hp);
      return { kind: "Captain", spyKind: "player", spyId: id, name: p.name, level: p.level || 1, hp: Number.isFinite(hp) ? hp : spec.hp, max: spec.hp, armor: spec.armor, speed: spec.speed, regen: spec.regen, pos: p.lookPosition || p.group.position, shipPos: p.group.position, shipType: p.shipType, group: p.group };
    }),
  ];
  const directTarget = requireShipHit
    ? candidates
      .map((item) => {
        if (!item.group?.visible) return null;
        const hit = raycaster.intersectObject(item.group, true)[0];
        return hit ? { ...item, pos: item.shipPos, distance: dist2(playerShip.position, item.shipPos), hitDistance: hit.distance } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.hitDistance - b.hitDistance)[0]
    : null;
  const scanned = requireShipHit ? [] : candidates.map((item) => {
    const scanPos = requireShipHit ? item.shipPos : item.pos;
    const toTarget = scanPos.clone().sub(playerShip.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    const forward = toTarget.dot(dir);
    const closest = playerShip.position.clone().add(dir.clone().multiplyScalar(forward));
    const missDistance = dist2(scanPos, closest);
    const aim = distance > 0.01 ? dir.dot(toTarget.clone().normalize()) : 0;
    return {
      ...item,
      pos: scanPos,
      distance,
      aim,
      forward,
      missDistance,
      hitRadius: shipHitRadius(item.shipType) * 0.95,
    };
  });
  const target = requireShipHit
    ? directTarget
    : scanned
      .filter((item) => item.distance < 135 && item.aim > -0.2)
      .sort((a, b) => (b.aim * 55 - b.distance * 0.35) - (a.aim * 55 - a.distance * 0.35))[0]
      || scanned
        .filter((item) => item.distance < 80)
        .sort((a, b) => a.distance - b.distance)[0];
  if (!target) {
    state.spyTarget = null;
    if (!requireShipHit) toast("Spyglass found no ships. Aim toward a sail.");
    updateSpyPanel();
    return;
  }
  const crateEstimate = crateDropCount({ isBot: true, shipType: target.shipType, level: target.level });
  const threat = target.level > state.level + 2 ? "Dangerous" : target.hp < target.max * 0.4 ? "Wounded" : "Manageable";
  state.spyTarget = { ...target, crateEstimate, threat, expires: clock.elapsedTime + 8 };
  updateSpyPanel();
}

function openShop(island) {
  closeForgePanel();
  state.dockedAt = island.name;
  ui.shopIsland.textContent = islandName(island);
  ui.shop.classList.remove("hidden");
  renderShop();
}

function closeShop() {
  ui.shop.classList.add("hidden");
}

function closeForgePanel() {
  state.forgeOpen = false;
  ui.forgePanel?.classList.add("hidden");
}

function nearForgePedestal() {
  const island = islands.find((item) => item.name === "Forge");
  if (!island?.forgePedestal || state.mode !== "land" || state.dockedAt !== "Forge") return false;
  return dist2(character.position, island.forgePedestal) < 5.2;
}

const FORGE_RECIPES = [
  {
    from: "grandfrigate",
    to: "superfrigate",
    intro: "The pedestal can reforge your Grand Frigate into this ship.",
    body: "A reinforced grand frigate refit with heavier broadsides, stronger armor, and a larger hold.",
  },
  {
    from: "windrunner",
    to: "tidebreaker",
    intro: "The pedestal can reforge your Windrunner into this ship.",
    body: "A larger Windrunner refit with stronger broadsides, more hull strength, and the same fast raider spirit.",
  },
  {
    from: "firstrate",
    to: "manofwar",
    intro: "The pedestal can reforge your First Rate into this ship.",
    body: "A heavier command ship with thicker sides, ten-gun broadsides, and a fortress-like hull.",
  },
  {
    from: "treasure",
    to: "treasureship",
    intro: "The pedestal can reforge your Treasure Junk into this ship.",
    body: "An immense treasure fleet flagship with a giant hold, towering decks, and heavier cannon decks.",
  },
];

function renderForgePanel() {
  if (!ui.forgeBody) return;
  const recipes = FORGE_RECIPES.filter((recipe) => state.shipType === recipe.from);
  if (!recipes.length) {
    ui.forgeBody.innerHTML = `<p class="stats">The crystal hums over the pedestal. Sail here with a Grand Frigate, Windrunner, First Rate, or Treasure Junk to unlock a Forge reforge.</p>`;
    return;
  }
  ui.forgeBody.innerHTML = recipes.map((recipe) => {
    const ship = getShipStats(recipe.to);
    const preview = shipPreviewImage(ship.id);
    const previewMarkup = preview
      ? `<img class="ship-preview" src="${preview}" alt="${shipName(ship)} preview">`
      : `<div class="ship-preview empty" aria-hidden="true"></div>`;
    return `<p class="stats">${recipe.intro}</p><div class="row ship-row forge-ship-row">${previewMarkup}<div class="ship-info"><div class="ship-title-line"><h3>${shipName(ship)} <span class="price">${t("price", { price: ship.price })}</span></h3><button data-forge-ship="${ship.id}">${t("buy")}</button></div><p>${recipe.body}</p><p>${t("shipStats", { hp: ship.hp, armor: Math.round(ship.armor * 100), speed: ship.speed, regen: ship.regen, hold: ship.capacity })} / Cannons ${shipSideCannons(ship.id)}/side</p>${shipCompareMarkup(ship)}</div></div>`;
  }).join("");
}

function buyForgeShip(id) {
  const recipe = FORGE_RECIPES.find((item) => item.to === id);
  if (!recipe) return;
  if (!nearForgePedestal()) return toast("Stand near the Forge pedestal.");
  const ship = getShipStats(id);
  if (state.shipType !== recipe.from) return toast(`The Forge only reforges a ${shipName(recipe.from)} into a ${shipName(recipe.to)}.`);
  if (!state.infiniteGold && state.gold < ship.price) return toast("Not enough gold.");
  if (totalCargoCount() > ship.capacity) return toast(`Sell cargo first. ${ship.name} holds ${ship.capacity}.`);
  const shipPosition = playerShip?.position?.clone() || state.position.clone();
  const shipRotation = playerShip?.rotation?.y ?? state.rotation;
  if (!state.infiniteGold) state.gold -= ship.price;
  replacePlayerShip(ship.id, shipPosition, { hp: ship.hp, rotation: shipRotation });
  state.mode = "land";
  state.viewMode = "ship";
  state.dockedAt = "Forge";
  closeForgePanel();
  character.visible = true;
  state.walkingPos.copy(character.position);
  multiplayer.lastSent = 0;
  playSound("forge", character.position);
  toast(`The Forge reforged your ${shipName(recipe.from)} into a ${shipName(recipe.to)}.`);
  updateHud();
}

function handleForgeBodyAction(event) {
  const button = event.target.closest("button[data-forge-ship]");
  if (!button) return;
  const now = performance.now();
  if (event.type === "click" && now - lastForgePointerHandledAt < 450) return;
  if (event.type === "pointerdown") lastForgePointerHandledAt = now;
  event.preventDefault();
  event.stopPropagation();
  if (button.disabled) return;
  buyForgeShip(button.dataset.forgeShip);
}

function openForgePanel() {
  if (!nearForgePedestal()) return false;
  closeShop();
  state.forgeOpen = true;
  renderForgePanel();
  ui.forgePanel?.classList.remove("hidden");
  playSound("forge", character.position);
  return true;
}

function ensureShipPreviewRenderer() {
  if (shipPreviewRenderer) return;
  shipPreviewScene = new THREE.Scene();
  shipPreviewCamera = new THREE.OrthographicCamera(-6.6, 6.6, 4.2, -4.2, 0.1, 90);
  shipPreviewCamera.position.set(7.4, 5.4, 8.2);
  shipPreviewCamera.lookAt(0, 1.0, 0);
  const fill = new THREE.HemisphereLight(0xffffff, 0x5fabb9, 1.9);
  shipPreviewScene.add(fill);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 5);
  shipPreviewScene.add(key);
  shipPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  shipPreviewRenderer.setPixelRatio(1);
  shipPreviewRenderer.setSize(190, 112, false);
  shipPreviewRenderer.setClearColor(0x000000, 0);
  shipPreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  shipPreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  shipPreviewRenderer.toneMappingExposure = 1.1;
}

function shipPreviewImage(type) {
  if (shipPreviewCache.has(type)) return shipPreviewCache.get(type);
  try {
    ensureShipPreviewRenderer();
    const group = makeShip(type, true);
    group.rotation.set(-0.06, -0.72, 0);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    group.position.sub(center);
    group.position.y += 0.5;
    group.scale.multiplyScalar(Math.min(1.25, 7.4 / maxDim));
    shipPreviewScene.add(group);
    shipPreviewRenderer.render(shipPreviewScene, shipPreviewCamera);
    const url = shipPreviewRenderer.domElement.toDataURL("image/png");
    shipPreviewScene.remove(group);
    shipPreviewCache.set(type, url);
    return url;
  } catch (error) {
    shipPreviewCache.set(type, "");
    return "";
  }
}

function tradeDescription(island, name, owned, buyPrice, sellPrice) {
  if (name === "Whale Blubber") {
    return t("blubberTrade", { owned });
  }
  const markets = islandData
    .map((item) => ({ name: item.name, sell: marketSellPrice(item, name) }))
    .sort((a, b) => b.sell - a.sell);
  const best = markets[0] || { name: island.name, sell: sellPrice };
  const profit = best.sell - buyPrice;
  const routeText = best.name === island.name
    ? t("betterSellHere")
    : t("bestKnownResale", { price: best.sell, island: islandName(best.name) });
  const profitText = profit > 0
    ? t("possibleProfit", { profit })
    : t("weakTradeRoute");
  return `${t("owned", { count: owned })} ${t("sellHere", { price: sellPrice })} ${routeText} ${profitText}`;
}

function shipRoleDescription(ship) {
  const speed = ship.speed >= 28 ? t("speedVeryFast") : ship.speed >= 22 ? t("speedQuick") : ship.speed <= 12 ? t("speedSlow") : t("speedSteady");
  const defense = ship.armor <= 0 ? t("noArmor") : ship.armor >= 0.14 ? t("heavyArmor") : ship.armor >= 0.08 ? t("solidArmor") : t("lightArmor");
  const hold = ship.capacity >= 38 ? t("hugeHold") : ship.capacity >= 22 ? t("largeHold") : ship.capacity <= 7 ? t("smallHold") : t("usefulHold");
  const durability = ship.hp >= 2400 ? t("massiveHp") : ship.hp >= 1500 ? t("highHp") : ship.hp <= 750 ? t("lightHp") : t("goodHp");
  const handling = ship.speed > 22 && ship.armor <= 0 ? t("speedBuild") : ship.speed <= 12 ? t("heavyBuild") : t("balancedBuild");
  const base = t("shipRole", { speed, durability, defense, hold, handling });
  return ship.tortugaBonusCrate ? `${base} Tortuga trait: enemies drop +1 crate when sunk.` : base;
}

function ammoDescription(ammo) {
  if (ammo.id === "hotshot") {
    const fire = ammo.fire || { dps: 0, duration: 0 };
    return t("hotshotDesc", { dps: fire.dps, duration: fire.duration });
  }
  if (ammo.id === "grapeshot") {
    return t("grapeshotDesc", { pellets: ammo.pellets, damage: Math.round(ammo.damageScale * 100), range: Math.round(ammo.rangeScale * 100) });
  }
  if (ammo.id === "harpoon") {
    return t("harpoonDesc");
  }
  if (ammo.id === "airburst") {
    return t("airburstDesc");
  }
  if (ammo.id === "rocketburst") {
    return t("rocketburstDesc");
  }
  return t("basicDesc");
}

function upgradeDescription(id) {
  if (id === "damage") {
    return t("damageUpgradeDesc", { damage: cannonDamage() });
  }
  if (id === "fireRate") {
    return t("reloadUpgradeDesc", { reload: cannonReload().toFixed(2), max: MAX_RELOAD_UPGRADES });
  }
  return t("rangeUpgradeDesc", { range: cannonRange() });
}

function renderShop() {
  const island = islands.find((item) => item.name === state.dockedAt) || islands[0];
  ui.tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === state.shopTab));
  if (island.exploreOnly) {
    ui.shopBody.innerHTML = `<p class="stats">${t("unchartedShop", { island: islandName(island) })}</p>`;
    return;
  }
  if (state.shopTab === "goods") {
    const marketGoods = [...goods];
    if (island.name === "Portsmouth" || blubberCount() > 0) marketGoods.push("Whale Blubber");
    const blubberLabel = state.shipType === "whaler"
      ? ` | ${t("blubber")} ${blubberCount()}/${blubberCapacity()}`
      : blubberCount() > 0
        ? t("blubberInHold", { count: blubberCount() })
        : "";
    ui.shopBody.innerHTML = `<p class="stats">${t("marketIntro", { culture: cultureName(island.culture), hold: cargoCount(), capacity: cargoCapacity(), blubber: blubberLabel })}</p>` + marketGoods.map((name) => {
      const owned = state.cargo[name] || 0;
      const buyPrice = marketBuyPrice(island, name);
      const sellPrice = marketSellPrice(island, name);
      const actions = name === "Whale Blubber"
        ? `<button data-sell="${name}" ${sellPrice <= 0 ? "disabled" : ""}>${t("sell")}</button>`
        : `<button data-buy="${name}">${t("buy")}</button><button data-sell="${name}">${t("sell")}</button>`;
      return `<div class="row"><div><h3>${goodName(name)} <span class="price">${buyPrice > 0 ? `${t("buyPrice", { price: buyPrice })} / ` : ""}${t("sellPrice", { price: sellPrice })}</span></h3><p>${tradeDescription(island, name, owned, buyPrice, sellPrice)}</p></div><div class="actions">${actions}</div></div>`;
    }).join("");
  } else if (state.shopTab === "ships") {
    const ships = availableShipsForIsland(island);
    ui.shopBody.innerHTML = `<p class="stats">${t("shipwrightIntro", { island: islandName(island), culture: cultureName(island.culture) })}</p>` + ships.map((ship) => {
      const sailing = ship.id === state.shipType;
      const owned = playerOwnsShip(ship.id);
      const preview = shipPreviewImage(ship.id);
      const previewMarkup = preview
        ? `<img class="ship-preview" src="${preview}" alt="${shipName(ship)} preview">`
        : `<div class="ship-preview empty" aria-hidden="true"></div>`;
      const buttonText = sailing ? t("sailing") : owned ? "Owned" : t("buy");
      return `<div class="row ship-row">${previewMarkup}<div class="ship-info"><div class="ship-title-line"><h3>${shipName(ship)} <span class="price">${t("price", { price: ship.price })}</span></h3><button data-ship="${ship.id}" ${owned ? "disabled" : ""}>${buttonText}</button></div><p>${shipRoleDescription(ship)}</p><p>${t("shipStats", { hp: ship.hp, armor: Math.round(ship.armor * 100), speed: ship.speed, regen: ship.regen, hold: ship.capacity })} / Cannons ${shipSideCannons(ship.id)}/side</p>${shipCompareMarkup(ship)}</div></div>`;
    }).join("");
  } else if (state.shopTab === "ammo") {
    const slotStatus = `<div class="ammo-slot-status">${state.ammoSlots.map((type, index) => {
      const ammo = type ? CANNONBALL_TYPES[type] : null;
      return `<span>${index + 1}: ${index === 0 ? t("basic") : ammo ? ammoShortName(ammo) : t("emptySlot")}</span>`;
    }).join("")}</div>`;
    const replacePrompt = state.pendingAmmoAssign && CANNONBALL_TYPES[state.pendingAmmoAssign]
      ? `<div class="row"><div><h3>${t("hotbarFull")}</h3><p>${t("replaceAmmoPrompt", { ammo: ammoName(state.pendingAmmoAssign) })}</p></div><div class="actions">${[1, 2, 3, 4].map((slot) => `<button data-replace-ammo="${state.pendingAmmoAssign}" data-slot="${slot}">${t("slot", { slot: slot + 1 })}</button>`).join("")}</div></div>`
      : "";
    const balloonRow = `<div class="row"><div><h3>${t("hotAirBalloon")} <span class="price">${t("each", { price: BALLOON_COST })}</span></h3><p>${t("balloonShopDesc", { owned: state.balloonStock, max: state.maxBalloons })}</p></div><div class="actions"><button data-buy-balloon="1" ${state.balloonStock >= state.maxBalloons ? "disabled" : ""}>${t("buy")}</button></div></div>`;
    ui.shopBody.innerHTML = `${slotStatus}${replacePrompt}` + SPECIAL_AMMO_TYPES.map((id) => {
      const ammo = CANNONBALL_TYPES[id];
      const owned = ammoCount(id);
      const description = ammoDescription(ammo);
      const amountButtons = ammo.abilityOnly
        ? `<button data-buy-ammo="${id}" data-amount="1">${t("buy")}</button><button data-buy-ammo="${id}" data-amount="5">${t("buyFive")}</button>`
        : `<button data-buy-ammo="${id}" data-amount="1">${t("buy")}</button><button data-buy-ammo="${id}" data-amount="5">${t("buyFive")}</button><button data-buy-ammo="${id}" data-amount="10">${t("buy")} 10</button><button data-buy-ammo="${id}" data-amount="25">${t("buy")} 25</button>`;
      return `<div class="row"><div><h3>${ammoName(ammo)} <span class="price">${t("each", { price: ammo.price })}</span></h3><p>${t("owned", { count: owned })} ${description}</p></div><div class="actions">${amountButtons}</div></div>`;
    }).join("") + balloonRow;
  } else if (state.shopTab === "items") {
    if (island.name !== "Tortuga") {
      ui.shopBody.innerHTML = `<p class="stats">This island has no special items for sale.</p>`;
    } else {
      const compass = SHOP_ITEMS.cursedCompass;
      const owned = hasCursedCompass();
      const heldByOther = Boolean(state.cursedCompassOwner && !owned && ![playerId, multiplayer.networkId, captainId].includes(state.cursedCompassOwner));
      const status = owned
        ? "You carry it."
        : heldByOther
          ? "Another captain has it right now."
          : "Available at Tortuga.";
      ui.shopBody.innerHTML = `<p class="stats">Tortuga sells rare contraband items.</p><div class="row"><div><h3>${compass.name} <span class="price">${t("price", { price: compass.price })}</span></h3><p>${status} ${compass.description}</p></div><div class="actions"><button data-buy-item="${compass.id}" ${owned || heldByOther ? "disabled" : ""}>${owned ? "Owned" : heldByOther ? "Taken" : t("buy")}</button></div></div>`;
    }
  } else {
    const ups = [
      ["damage", t("cannonDamage"), upgradeDescription("damage")],
      ["fireRate", t("fireRate"), upgradeDescription("fireRate")],
      ["range", t("cannonRange"), upgradeDescription("range")],
    ];
    ui.shopBody.innerHTML = `<p class="stats">${t("upgradePoints", { points: state.points })}</p>` + ups.map(([id, name, desc]) => (
      `<div class="row"><div><h3>${name} ${t("lvl", { level: state.upgrades[id] })}${id === "fireRate" ? `/${MAX_RELOAD_UPGRADES}` : ""}</h3><p>${desc}</p></div><button data-upgrade="${id}" ${id === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES ? "disabled" : ""}>${id === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES ? t("max") : t("spend")}</button></div>`
    )).join("");
  }
}

function handleShopBodyAction(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const now = performance.now();
  if (event.type === "click" && now - lastShopPointerHandledAt < 450) return;
  if (event.type === "pointerdown") lastShopPointerHandledAt = now;
  event.preventDefault();
  event.stopPropagation();
  if (button.disabled) return;
  const island = islands.find((item) => item.name === state.dockedAt);
  if (button.dataset.buy) {
    const name = button.dataset.buy;
    const price = marketBuyPrice(island, name);
    if (state.gold < price) return toast("Not enough gold.");
    if (cargoCount() >= cargoCapacity()) return toast("Your hold is full. Upgrade ship capacity or sell cargo.");
    state.gold -= price;
    state.cargo[name] = (state.cargo[name] || 0) + 1;
    playSound("coins");
    toast(`Bought ${name}.`);
  }
  if (button.dataset.sell) {
    const name = button.dataset.sell;
    if (!state.cargo[name]) return toast("No cargo to sell.");
    state.cargo[name]--;
    state.gold += marketSellPrice(island, name);
    addXP(4);
    playSound("coins");
    toast(`Sold ${name}.`);
  }
  if (button.dataset.ship) {
    const ship = getShipStats(button.dataset.ship);
    if (!availableShipsForIsland(island).some((item) => item.id === ship.id)) return toast("That ship is not sold here.");
    if (forgeBaseForPortShip(ship.id) && !goldDiggerCanBuyForgeShipAtIsland(ship.id, island)) return toast("That ship is only reforged at the Forge pedestal.");
    if (playerOwnsShip(ship.id)) return toast(`You already own a ${ship.name}.`);
    if (state.gold < ship.price) return toast("Not enough gold.");
    if (regularCargoCount() > ship.capacity) return toast(`Sell cargo first. ${ship.name} holds ${ship.capacity} regular cargo.`);
    if (ship.id === "whaler") {
      if (blubberCount() > (ship.blubberCapacity || 50)) return toast(`${ship.name} cannot carry that much whale blubber.`);
    } else if (totalCargoCount() > ship.capacity) {
      return toast(`Sell cargo first. ${ship.name} holds ${ship.capacity}.`);
    }
    const spawnPoint = spawnPositionBesideCurrentShip(ship.id, island);
    parkCurrentShipAtIsland(island?.name || state.dockedAt);
    state.gold -= ship.price;
    replacePlayerShip(ship.id, spawnPoint);
    state.dockedAt = island?.name || state.dockedAt;
    if (ship.id === "modernschooner") {
      state.modernSchoonerPurchased = true;
      state.modernSchoonerAvailable = false;
    }
    if (ship.id === "ballooner") state.balloonStock = Math.max(state.balloonStock, 3);
    multiplayer.lastSent = 0;
    playSound("coins");
    toast(`${ship.name} launched. Your old ship is docked here.`);
  }
  if (button.dataset.buyItem) {
    const item = SHOP_ITEMS[button.dataset.buyItem];
    if (!item) return;
    if (!island || island.name !== "Tortuga") return toast("That item is only sold at Tortuga.");
    if (item.id === "cursedCompass") {
      if (hasCursedCompass()) return toast("You already carry the Cursed Compass.");
      if (state.cursedCompassOwner && ![playerId, multiplayer.networkId, captainId].includes(state.cursedCompassOwner)) return toast("Another captain has the Cursed Compass.");
      if (state.gold < item.price) return toast("Not enough gold.");
      if (multiplayer.serverWorld) {
        sendMultiplayer({ type: "buyItem", item: item.id, island: island.name, clientId: captainId });
        return;
      }
      state.gold -= item.price;
      setCursedCompassOwned(true, playerId);
      playSound("compass");
      toast("The Cursed Compass points beyond the map.");
    }
  }
  if (button.dataset.buyAmmo) {
    const ammo = CANNONBALL_TYPES[button.dataset.buyAmmo];
    if (!ammo || ammo.infinite) return;
    const maxBuyAmount = ammo.abilityOnly ? 5 : 25;
    const amount = clamp(Math.floor(Number(button.dataset.amount) || 1), 1, maxBuyAmount);
    const cost = ammo.price * amount;
    if (state.gold < cost) return toast("Not enough gold.");
    state.gold -= cost;
    state.ammo[ammo.id] = ammoCount(ammo.id) + amount;
    const placed = ammo.abilityOnly ? true : placeAmmoOnHotbar(ammo.id);
    playSound("coins");
    toast(placed ? `Bought ${amount} ${ammo.name}.` : `Bought ${amount} ${ammo.name}. Replace a hotbar slot.`);
  }
  if (button.dataset.replaceAmmo) {
    const ammo = CANNONBALL_TYPES[button.dataset.replaceAmmo];
    if (!ammo) return;
    assignAmmoSlot(button.dataset.slot, ammo.id);
    toast(`${ammo.name} assigned to slot ${Number(button.dataset.slot) + 1}.`);
  }
  if (button.dataset.buyBalloon) {
    if (state.balloonStock >= state.maxBalloons) return toast("You already have the maximum number of balloons.");
    if (state.gold < BALLOON_COST) return toast("Not enough gold.");
    state.gold -= BALLOON_COST;
    state.balloonStock++;
    playSound("coins");
    toast("Hot air balloon purchased.");
  }
  if (button.dataset.upgrade) {
    if (state.points < 1) return toast("Level up to earn upgrade points.");
    if (button.dataset.upgrade === "fireRate" && state.upgrades.fireRate >= MAX_RELOAD_UPGRADES) return toast("Reload upgrade is maxed.");
    state.points--;
    state.upgrades[button.dataset.upgrade]++;
    playSound("coins");
    toast("Upgrade installed.");
  }
  renderShop();
  updateHud();
}

ui.shopBody.addEventListener("pointerdown", handleShopBodyAction);
ui.shopBody.addEventListener("click", handleShopBodyAction);
function containShopScroll(event) {
  if (!event.target?.closest?.("#shop")) return;
  event.stopPropagation();
}
ui.shop?.addEventListener("wheel", containShopScroll, { passive: true });
ui.shopBody?.addEventListener("wheel", containShopScroll, { passive: true });
ui.shop?.addEventListener("mousedown", (event) => {
  if (event.button === 1) event.preventDefault();
});

function makeBalloonMesh(showDirectionArrow = false) {
  const group = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(1.8, 18, 12), new THREE.MeshStandardMaterial({ color: 0xd85842, roughness: 0.82, metalness: 0.02 }));
  envelope.scale.set(1.05, 1.22, 1.05);
  envelope.position.y = 4.6;
  envelope.castShadow = true;
  group.add(envelope);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.055, 6, 24), mat(0xf3d178));
  band.position.y = 4.2;
  group.add(band);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.72, 1.1), mats.plank);
  basket.position.y = 1.9;
  basket.castShadow = true;
  group.add(basket);
  if (showDirectionArrow) {
    const arrow = new THREE.Group();
    arrow.position.set(0, 6.96, 0.08);
    const arrowBacking = new THREE.Group();
    const backingHead = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.55, 3), new THREE.MeshBasicMaterial({ color: 0x17323b }));
    backingHead.rotation.x = Math.PI / 2;
    backingHead.position.z = 0.72;
    arrowBacking.add(backingHead);
    const backingTail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 1.45), new THREE.MeshBasicMaterial({ color: 0x17323b }));
    backingTail.position.z = -0.22;
    arrowBacking.add(backingTail);
    arrowBacking.position.y = -0.035;
    arrow.add(arrowBacking);
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.32, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 0.72;
    arrow.add(arrowHead);
    const arrowTail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 1.25), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    arrowTail.position.z = -0.16;
    arrow.add(arrowTail);
    group.add(arrow);
  }
  for (const sx of [-0.45, 0.45]) {
    for (const sz of [-0.4, 0.4]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 5), mat(0x3b2d24));
      rope.position.set(sx, 3.0, sz);
      rope.rotation.x = sx * 0.08;
      group.add(rope);
    }
  }
  group.userData.balloon = true;
  return group;
}

function activeBalloon() {
  return state.viewMode === "balloon" ? balloons[state.activeBalloonIndex] : null;
}

function ensureBalloonReticle() {
  if (balloonReticle) return balloonReticle;
  balloonReticle = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.75, 40), new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  balloonReticle.add(ring);
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.035, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0.72 }));
  crossA.position.y = 0.04;
  balloonReticle.add(crossA);
  const crossB = crossA.clone();
  crossB.rotation.y = Math.PI / 2;
  balloonReticle.add(crossB);
  balloonReticle.visible = false;
  scene.add(balloonReticle);
  return balloonReticle;
}

function ensureBalloonDirectionArrow() {
  if (balloonDirectionArrow) return balloonDirectionArrow;
  balloonDirectionArrow = new THREE.Group();
  const backing = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.55, 3), new THREE.MeshBasicMaterial({ color: 0x17323b, depthTest: false, depthWrite: false }));
  backing.rotation.x = Math.PI / 2;
  backing.position.z = 0.72;
  balloonDirectionArrow.add(backing);
  const backingTail = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 1.45), new THREE.MeshBasicMaterial({ color: 0x17323b, depthTest: false, depthWrite: false }));
  backingTail.position.set(0, -0.035, -0.22);
  balloonDirectionArrow.add(backingTail);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.32, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.72;
  balloonDirectionArrow.add(head);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 1.25), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false }));
  tail.position.z = -0.16;
  balloonDirectionArrow.add(tail);
  balloonDirectionArrow.renderOrder = 30;
  balloonDirectionArrow.visible = false;
  scene.add(balloonDirectionArrow);
  return balloonDirectionArrow;
}

function predictedBalloonBombPoint(balloon) {
  const plan = ensureBalloonBombPlan(balloon);
  const start = balloon.group.position.clone().add(plan.offset);
  const velocity = balloonBombVelocity(balloon, plan);
  return simulateBalloonBombImpact(start, velocity);
}

function updateBalloonReticle() {
  const reticle = ensureBalloonReticle();
  const arrow = ensureBalloonDirectionArrow();
  const balloon = activeBalloon();
  reticle.visible = Boolean(balloon && !balloon.destroyed && balloon.bomb && !balloon.landing);
  arrow.visible = Boolean(balloon && !balloon.destroyed && !balloon.landing);
  if (arrow.visible) {
    arrow.position.set(balloon.group.position.x, balloon.group.position.y + 7.05, balloon.group.position.z);
    arrow.rotation.set(0, balloon.rotation, 0);
    const arrowPulse = 1 + Math.sin(clock.elapsedTime * 4.8) * 0.045;
    arrow.scale.setScalar(arrowPulse);
  }
  if (reticle.visible) {
    const point = predictedBalloonBombPoint(balloon);
    reticle.position.copy(point);
    const pulse = 1 + Math.sin(clock.elapsedTime * 5.4) * 0.08;
    reticle.scale.set(pulse, pulse, pulse);
  }
}

function launchBalloon() {
  if (state.mode !== "ship" || state.shipType !== "ballooner") return toast("Only a Ballooner can launch hot air balloons.");
  if (balloons.filter((balloon) => !balloon.destroyed).length >= 3) return toast("Only 3 balloons can be launched at once.");
  if (state.balloonStock <= 0) return toast("No spare hot air balloons.");
  const group = makeBalloonMesh();
  group.position.copy(playerShip.position).add(new THREE.Vector3(0, 22, 0));
  group.rotation.y = state.rotation;
  scene.add(group);
  state.balloonStock--;
  balloons.push({
    group,
    hp: 100,
    velocity: new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation)).multiplyScalar(6),
    rotation: state.rotation,
    bank: 0,
    bomb: true,
    landing: false,
    destroyed: false,
  });
  toast("Balloon launched. Press V to switch view.");
}

function ensureBalloonBombPlan(balloon) {
  if (!balloon.bombPlan) {
    balloon.bombPlan = {
      offset: new THREE.Vector3((Math.random() - 0.5) * 2.4, -2.1, (Math.random() - 0.5) * 2.4),
      drift: new THREE.Vector3((Math.random() - 0.5) * 2.4, -10, (Math.random() - 0.5) * 2.4),
    };
  }
  return balloon.bombPlan;
}

function balloonBombVelocity(balloon, plan = ensureBalloonBombPlan(balloon)) {
  return new THREE.Vector3(balloon.velocity.x, 0, balloon.velocity.z).multiplyScalar(0.85).add(plan.drift);
}

function simulateBalloonBombImpact(start, velocity) {
  const fallHeight = Math.max(0.01, start.y - 0.2);
  const time = Math.max(0.01, (velocity.y + Math.sqrt(velocity.y * velocity.y + 2 * BALLOON_BOMB_GRAVITY * fallHeight)) / BALLOON_BOMB_GRAVITY);
  return start.clone().add(velocity.clone().multiplyScalar(time)).setY(0.08);
}

function cycleViewMode() {
  const usable = balloons.filter((balloon) => !balloon.destroyed);
  if (!usable.length || state.viewMode !== "balloon") {
    if (!usable.length) {
      state.viewMode = "ship";
      state.activeBalloonIndex = -1;
      return toast("Ship view.");
    }
    state.viewMode = "balloon";
    state.activeBalloonIndex = balloons.indexOf(usable[0]);
    return toast("Balloon view.");
  }
  const current = usable.indexOf(balloons[state.activeBalloonIndex]);
  if (current < usable.length - 1) {
    state.activeBalloonIndex = balloons.indexOf(usable[current + 1]);
    toast("Next balloon view.");
  } else {
    state.viewMode = "ship";
    state.activeBalloonIndex = -1;
    toast("Ship view.");
  }
}

function landActiveBalloon() {
  const balloon = activeBalloon();
  if (!balloon || balloon.destroyed) return;
  balloon.landing = true;
  toast("Balloon descending. Keep it above the Ballooner.");
}

function destroyBalloon(balloon, cause = "crash") {
  if (!balloon || balloon.destroyed) return;
  balloon.destroyed = true;
  balloon.fallVelocity = -1.6;
  balloon.fallSpin = new THREE.Vector3((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.8);
  balloon.cause = cause;
  if (state.activeBalloonIndex === balloons.indexOf(balloon)) {
    state.viewMode = "ship";
    state.activeBalloonIndex = -1;
  }
}

function makeBalloonBombMesh() {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.82, 14, 10), mat(0x2f2a24));
  mesh.castShadow = true;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 6, 16), mat(0x6b4a2e));
  band.rotation.x = Math.PI / 2;
  mesh.add(band);
  return mesh;
}

function dropBalloonBomb(balloon) {
  if (!balloon || balloon.destroyed) return;
  if (!balloon.bomb) return toast("This balloon has already dropped its bomb.");
  balloon.bomb = false;
  const plan = ensureBalloonBombPlan(balloon);
  const start = balloon.group.position.clone().add(plan.offset);
  const velocity = balloonBombVelocity(balloon, plan);
  if (multiplayer.serverWorld && sendMultiplayer({
    type: "balloonBomb",
    x: start.x,
    y: start.y,
    z: start.z,
    vx: velocity.x,
    vy: velocity.y,
    vz: velocity.z,
  })) {
    toast("Bomb away.");
    return;
  }
  const mesh = makeBalloonBombMesh();
  mesh.position.copy(start);
  scene.add(mesh);
  balloonBombs.push({ mesh, start, velocity, born: clock.elapsedTime, bornWall: Date.now() });
  toast("Bomb away.");
}

function makeAirburstExplosionVisual(center) {
  const group = new THREE.Group();
  group.position.copy(center);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 10), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.86 }));
  flash.userData.puff = true;
  group.add(flash);
  const ring = new THREE.Mesh(new THREE.RingGeometry(AIRBURST_RADIUS * 0.9, AIRBURST_RADIUS, 42), new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = Math.PI / 2;
  ring.userData.puff = true;
  group.add(ring);
  addImpactEffect(group, 0.75);
}

function detonateAirburst(shot) {
  const center = shot.target.clone();
  center.y = 24;
  makeAirburstExplosionVisual(center);
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const d = balloon.group.position.distanceTo(center);
    if (d > AIRBURST_RADIUS) return;
    const damage = AIRBURST_DAMAGE * clamp(1 - d / Math.max(1, AIRBURST_RADIUS), 0, 1);
    balloon.hp -= damage;
    if (balloon.hp <= 0) destroyBalloon(balloon, "airburst");
  });
  if (multiplayer.serverWorld) {
    serverBotBalloons.forEach((balloon) => {
      const d = balloon.group.position.distanceTo(center);
      if (d > AIRBURST_RADIUS) return;
      const damage = AIRBURST_DAMAGE * clamp(1 - d / Math.max(1, AIRBURST_RADIUS), 0, 1);
      sendMultiplayer({ type: "hitBotBalloon", id: balloon.serverId, damage });
    });
  }
}

function bombKnockbackVector(origin, target, radius, strength = BALLOON_BOMB_KNOCKBACK, weightScale = 1) {
  const away = target.clone().sub(origin);
  away.y = 0;
  const distance = away.length();
  if (distance > radius) return null;
  if (distance <= 0.001) away.set(Math.sin(clock.elapsedTime * 9.1), 0, Math.cos(clock.elapsedTime * 9.1));
  else away.multiplyScalar(1 / distance);
  const falloff = clamp(1 - distance / Math.max(1, radius), 0.32, 1);
  return away.multiplyScalar(strength * falloff * weightScale);
}

function pushFloatingLootFromExplosion(position, radius, strength = BALLOON_BOMB_KNOCKBACK * 0.72) {
  crates.forEach((crate) => {
    const knockback = bombKnockbackVector(position, crate.mesh.position, radius, strength, crate.kind === "treasure" || crate.kind === "kraken" ? 0.8 : 1);
    if (!knockback) return;
    crate.velocity = crate.velocity || new THREE.Vector3();
    crate.velocity.add(knockback);
  });
}

function detonateBalloonBomb(position, options = {}) {
  makeSplashEffect(position);
  const boom = new THREE.Group();
  boom.position.copy(position).setY(1.2);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd06b, transparent: true, opacity: 0.86 }));
  flash.userData.puff = true;
  boom.add(flash);
  for (let i = 0; i < 14; i++) {
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.8), mat(i % 2 ? 0x5a3725 : 0x2f2a24));
    shard.position.set((Math.random() - 0.5) * 2.2, 0.2 + Math.random() * 1.2, (Math.random() - 0.5) * 2.2);
    shard.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 8, 5 + Math.random() * 8, (Math.random() - 0.5) * 8);
    shard.userData.spin = new THREE.Vector3(Math.random() * 7, Math.random() * 7, Math.random() * 7);
    boom.add(shard);
  }
  addImpactEffect(boom, 0.9);
  addWaveHazard(position, { dps: 15, force: 24, radiusStart: 4, radiusEnd: 26, thickness: 4, life: 3.5, damageShips: !options.visualOnly, source: "bomb" });
  const damage = Number(options.damage) || BALLOON_BOMB_DAMAGE;
  pushFloatingLootFromExplosion(position, BALLOON_BOMB_BLAST_RADIUS + 8);
  const hitShip = (target, pos, type) => {
    const d = dist2(position, pos);
    const radius = BALLOON_BOMB_BLAST_RADIUS + shipHitRadius(type) * 0.5;
    if (d >= radius) return;
    const falloff = clamp(1 - d / Math.max(1, radius), 0.32, 1);
    const velocity = target === state ? state.velocity : target.velocity;
    const knockback = velocity ? bombKnockbackVector(position, pos, radius, BALLOON_BOMB_KNOCKBACK, clamp(95 / shipWeight(type), 0.38, 1.25)) : null;
    if (knockback) velocity.add(knockback);
    damageTarget(target, bombDamageForShip(type, damage * falloff), { ignoreArmor: true });
  };
  if (!options.visualOnly) {
    if (state.mode === "ship") hitShip(state, playerShip.position, state.shipType);
    bots.forEach((bot) => hitShip(bot, bot.group.position, bot.shipType));
  }
  if (!options.visualOnly || options.affectAnimals) animals.forEach((animal) => {
    const d = dist2(position, animal.group.position);
    const radius = BALLOON_BOMB_BLAST_RADIUS + animalHitRadius(animal) * 0.65;
    if (d < radius) {
      const falloff = clamp(1 - d / Math.max(1, radius), 0.3, 1);
      const knockback = bombKnockbackVector(position, animal.group.position, radius, BALLOON_BOMB_KNOCKBACK, animal.kind === "whale" ? 0.52 : 1);
      if (knockback) {
        animal.bombImpulse = animal.bombImpulse || new THREE.Vector3();
        animal.bombImpulse.add(knockback);
      }
      animal.hp -= damage * falloff;
      animal.aggressiveUntil = clock.elapsedTime + 12;
      animal.submergedUntil = 0;
      if (animal.hp <= 0) damageAnimal(animal, { ammoType: "bomb", damage: 9999, mesh: { position } });
    }
  });
  if (!options.visualOnly && krakenBoss?.alive && krakenBoss.group) {
    const head = krakenHeadWorldPosition() || krakenBoss.group.position;
    const d = dist2(position, head);
    const radius = 28;
    if (d < radius) {
      const amount = damage * clamp(1 - d / radius, 0.32, 1);
      krakenBoss.hp = Math.max(0, (krakenBoss.hp || 0) - amount);
      if (multiplayer.serverWorld) sendMultiplayer({ type: "hitKraken", damage: amount });
      if (krakenBoss.hp <= 0) krakenBoss.alive = false;
    }
  }
  if (!options.visualOnly) balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const d = dist2(position, balloon.group.position);
    if (d < 9) {
      balloon.hp -= 100;
      if (balloon.hp <= 0) destroyBalloon(balloon, "bomb");
    }
  });
}

function updateBalloons(dt) {
  serverBotBalloons.slice().forEach((balloon) => {
    const previousRotation = balloon.group.rotation.y;
    if (balloon.serverPosition) balloon.group.position.lerp(balloon.serverPosition, clamp(dt * (balloon.falling ? 8 : 6), 0, balloon.falling ? 0.45 : 0.3));
    if (Number.isFinite(balloon.serverRotation)) balloon.group.rotation.y = lerpAngle(balloon.group.rotation.y, balloon.serverRotation, clamp(dt * 6, 0, 0.3));
    if (balloon.falling) {
      balloon.group.rotation.x += dt * (balloon.fallSpin?.x || 0.8);
      balloon.group.rotation.y += dt * (balloon.fallSpin?.y || 0.4);
      balloon.group.rotation.z += dt * (balloon.fallSpin?.z || 1.0);
    } else {
      const turnRate = angleDelta(balloon.group.rotation.y, previousRotation) / Math.max(dt, 0.001);
      const targetBank = clamp(-turnRate * 0.08, -0.18, 0.18);
      balloon.bank = (balloon.bank || 0) + (targetBank - (balloon.bank || 0)) * clamp(dt * 4.5, 0, 1);
      balloon.group.rotation.x *= Math.pow(0.08, dt);
      balloon.group.rotation.z = balloon.bank || 0;
    }
  });
  const controlled = activeBalloon();
  balloons.slice().forEach((balloon, index) => {
    if (balloon.destroyed) {
      balloon.fallVelocity = (balloon.fallVelocity || -1.6) - 7.5 * dt;
      balloon.group.position.y += balloon.fallVelocity * dt;
      balloon.group.position.x += Math.sin(clock.elapsedTime * 3.4 + index) * dt * 0.9;
      balloon.group.position.z += Math.cos(clock.elapsedTime * 2.9 + index) * dt * 0.9;
      balloon.group.rotation.x += dt * (balloon.fallSpin?.x || 0.8);
      balloon.group.rotation.y += dt * (balloon.fallSpin?.y || 0.4);
      balloon.group.rotation.z += dt * (balloon.fallSpin?.z || 1.0);
      if (balloon.group.position.y <= 0.4) {
        const pos = balloon.group.position.clone().setY(0);
        makeSplashEffect(pos);
        makeSplinterEffect(pos.clone().setY(0.8), new THREE.Vector3(1, 0, 0));
        if (state.mode === "ship" && dist2(balloon.group.position, playerShip.position) < shipHitRadius(state.shipType) + 3) damageTarget(state, 50);
        scene.remove(balloon.group);
        const actualIndex = balloons.indexOf(balloon);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
      }
      return;
    }
    if (balloon === controlled && !balloon.landing) {
      const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
      const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 0.55 : 0);
      balloon.rotation += turn * dt * 1.7;
      const targetBank = -turn * 0.18;
      balloon.bank = (balloon.bank || 0) + (targetBank - (balloon.bank || 0)) * clamp(dt * 5.2, 0, 1);
      const forward = new THREE.Vector3(Math.sin(balloon.rotation), 0, Math.cos(balloon.rotation));
      balloon.velocity.add(forward.multiplyScalar(throttle * 20 * dt));
      balloon.velocity.multiplyScalar(Math.pow(0.9, dt * 6));
    } else if (!balloon.landing) {
      balloon.velocity.multiplyScalar(Math.pow(0.58, dt * 6));
      balloon.bank = (balloon.bank || 0) * Math.pow(0.08, dt);
    } else {
      balloon.bank = (balloon.bank || 0) * Math.pow(0.12, dt);
    }
    if (balloon === controlled || balloon.landing) {
      balloon.velocity.add(windAt(balloon.group.position).multiplyScalar(dt * (balloon.landing ? 0.45 : 2.35)));
    }
    if (balloon.landing) {
      const toShip = playerShip.position.clone().sub(balloon.group.position);
      toShip.y = 0;
      if (toShip.lengthSq() > 0.01) {
        toShip.normalize();
        balloon.velocity.lerp(toShip.multiplyScalar(12), clamp(dt * 2.2, 0, 0.2));
      }
      balloon.velocity.x += Math.sin(clock.elapsedTime * 2.4 + index) * dt * 0.75;
      balloon.velocity.z += Math.cos(clock.elapsedTime * 1.9 + index) * dt * 0.75;
      balloon.group.position.y -= dt * 4.8;
    }
    balloon.group.position.add(balloon.velocity.clone().multiplyScalar(dt));
    if (balloon.landing) {
      if (balloon.group.position.y <= 5.0 && dist2(balloon.group.position, playerShip.position) < shipHitRadius(state.shipType) + 4 && state.shipType === "ballooner") {
        const actualIndex = balloons.indexOf(balloon);
        scene.remove(balloon.group);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
        state.balloonStock = Math.min(state.maxBalloons, state.balloonStock + 1);
        if (state.activeBalloonIndex === actualIndex) {
          state.viewMode = "ship";
          state.activeBalloonIndex = -1;
        }
        toast("Balloon recovered.");
        return;
      }
      if (balloon.group.position.y <= 0.55) {
        const pos = balloon.group.position.clone().setY(0);
        makeSplashEffect(pos);
        const actualIndex = balloons.indexOf(balloon);
        scene.remove(balloon.group);
        if (actualIndex >= 0) balloons.splice(actualIndex, 1);
        if (state.activeBalloonIndex === actualIndex) {
          state.viewMode = "ship";
          state.activeBalloonIndex = -1;
        }
        toast("Balloon splashed down.");
        return;
      }
    } else {
      balloon.group.position.y += (24 + Math.sin(clock.elapsedTime * 1.4 + index) * 1.2 - balloon.group.position.y) * clamp(dt * 0.8, 0, 0.05);
    }
    balloon.group.rotation.y = balloon.rotation;
    balloon.group.rotation.z = balloon.bank || 0;
    if (Math.abs(balloon.group.position.x) > WATERFALL_LIMIT || Math.abs(balloon.group.position.z) > WATERFALL_LIMIT) destroyBalloon(balloon, "edge");
  });
  for (let i = 0; i < balloons.length; i++) {
    for (let j = i + 1; j < balloons.length; j++) {
      if (!balloons[i].destroyed && !balloons[j].destroyed && balloons[i].group.position.distanceTo(balloons[j].group.position) < 3.2) {
        destroyBalloon(balloons[i], "collision");
        destroyBalloon(balloons[j], "collision");
      }
    }
  }
  balloonBombs.slice().forEach((bomb) => {
    if (bomb.serverId) {
      bomb.mesh.rotation.x += dt * 4;
      bomb.mesh.rotation.z += dt * 1.7;
      return;
    }
    const age = Number.isFinite(bomb.bornWall)
      ? Math.max(0, (Date.now() - bomb.bornWall) / 1000)
      : Math.max(0, clock.elapsedTime - (bomb.born ?? clock.elapsedTime));
    bomb.mesh.position.copy(bomb.start.clone().add(bomb.velocity.clone().multiplyScalar(age)));
    bomb.mesh.position.y = bomb.start.y + bomb.velocity.y * age - 0.5 * BALLOON_BOMB_GRAVITY * age * age;
    bomb.mesh.rotation.x += dt * 4;
    if (bomb.mesh.position.y <= 0.2) {
      const pos = bomb.mesh.position.clone().setY(0);
      scene.remove(bomb.mesh);
      balloonBombs.splice(balloonBombs.indexOf(bomb), 1);
      detonateBalloonBomb(pos);
    }
  });
}

function updateShip(dt) {
  const spec = getShipStats();
  syncActionCooldowns();
  const netsActive = state.shipType === "whaler" && state.whalerNets;
  state.whalerNetProgress += ((netsActive ? 1 : 0) - state.whalerNetProgress) * clamp(dt * 4.8, 0, 1);
  updateWhalerNetVisuals(playerShip, netsActive, dt);
  updateTurtleFire(dt);
  updateFireDamage(state, dt, state.velocity.length());
  state.hp = clamp(state.hp + spec.regen * dt, 0, maxHp());
  updateDocking(dt);
  if (state.fallingOffWorld) {
    state.fallingTimer += dt;
    state.fallVelocityY -= (27 + state.fallingTimer * 8) * dt;
    const drift = state.fallDrift.clone().multiplyScalar(dt);
    playerShip.position.add(drift);
    playerShip.position.y += state.fallVelocityY * dt;
    state.fallDrift.multiplyScalar(Math.pow(0.985, dt * 60));
    state.velocity.copy(state.fallDrift);
    playerShip.rotation.set(
      Math.sin(state.fallingTimer * 1.6) * 0.22 + state.fallSpin.x * state.fallingTimer,
      state.rotation + state.fallSpin.y * state.fallingTimer,
      Math.cos(state.fallingTimer * 1.35) * 0.18 + state.fallSpin.z * state.fallingTimer,
    );
    state.position.copy(playerShip.position);
    if (state.fallingTimer > 9.2 || playerShip.position.y < -820) {
      state.fallingOffWorld = false;
      state.fallingTimer = 0;
      state.fallVelocityY = 0;
      state.fallDrift.set(0, 0, 0);
      state.fallSpin.set(0, 0, 0);
      state.shipBank = 0;
      playerShip.rotation.set(0, state.rotation, 0);
      damageTarget(state, maxHp() * 4);
    }
    return;
  }
  if (state.leviathanGrabbed) {
    state.velocity.set(0, 0, 0);
    state.shipBank *= Math.pow(0.08, dt);
    playerShip.rotation.set(0, state.rotation, state.shipBank);
    state.position.copy(playerShip.position);
    return;
  }
  if (state.viewMode === "deck" || state.viewMode === "swim") {
    state.velocity.multiplyScalar(Math.pow(0.5, dt * 8));
    playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * PLAYER_SHIP_BOB;
    state.shipBank *= Math.pow(0.08, dt);
    playerShip.rotation.set(0, state.rotation, state.shipBank);
    updateSeaWalker(dt);
    state.position.copy(playerShip.position);
    return;
  }
  if (state.viewMode === "balloon") {
    state.velocity.multiplyScalar(Math.pow(0.55, dt * 8));
    playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * PLAYER_SHIP_BOB;
    state.shipBank *= Math.pow(0.08, dt);
    playerShip.rotation.set(0, state.rotation, state.shipBank);
    state.position.copy(playerShip.position);
    return;
  }
  const effectiveSpeed = state.shipType === "whaler" && state.whalerNets ? 9 : spec.speed;
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 0.55 : 0);
  const rudderSpeedRatio = clamp(state.velocity.length() / Math.max(1, effectiveSpeed * 0.65), 0, 1);
  const rudderAuthority = rudderSpeedRatio * rudderSpeedRatio * (3 - 2 * rudderSpeedRatio);
  const speedTurnScale = clamp(effectiveSpeed / 18, 0.45, 1.25);
  state.rotation += turn * dt * (1.25 + effectiveSpeed / 32) * speedTurnScale * rudderAuthority;
  const bankSpeedRatio = clamp(state.velocity.length() / Math.max(1, effectiveSpeed), 0, 1.15);
  const targetShipBank = -turn * rudderAuthority * bankSpeedRatio * 0.075;
  state.shipBank += (targetShipBank - state.shipBank) * clamp(dt * 4.4, 0, 1);
  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  state.velocity.add(forward.multiplyScalar(throttle * effectiveSpeed * dt));
  const wind = windAt(playerShip.position);
  state.velocity.add(wind.multiplyScalar(dt * (Math.abs(throttle) > 0.05 ? 0.35 : 0.82)));
  state.velocity.multiplyScalar(Math.pow(0.86, dt * 9));
  const next = playerShip.position.clone().add(state.velocity.clone().multiplyScalar(dt));
  const hullRadius = shipHitRadius(state.shipType);
  const blockedIsland = islands.some((island) => !island.forge && islandFootprintContains(island, next, hullRadius * 0.28));
  if (!blockedIsland) {
    playerShip.position.copy(next);
  } else {
    state.velocity.multiplyScalar(-0.22);
  }
  playerShip.rotation.set(0, state.rotation, state.shipBank);
  playerShip.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.8) * PLAYER_SHIP_BOB;
  state.position.copy(playerShip.position);
  if (Math.abs(playerShip.position.x) > WATERFALL_LIMIT || Math.abs(playerShip.position.z) > WATERFALL_LIMIT) {
    state.fallingOffWorld = true;
    state.fallingTimer = 0;
    state.fallVelocityY = -4.5;
    state.fallSpin.set((Math.random() - 0.5) * 0.26, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.32);
    const outward = playerShip.position.clone().setY(0);
    if (outward.lengthSq() < 0.01) outward.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
    outward.normalize();
    state.fallDrift.copy(state.velocity);
    if (state.fallDrift.length() < 12) state.fallDrift.add(outward.multiplyScalar(12));
    makeSplashEffect(playerShip.position.clone().setY(0));
  } else if (!multiplayer.serverWorld && (Math.abs(playerShip.position.x) > MINIMAP_VISIBLE_LIMIT || Math.abs(playerShip.position.z) > MINIMAP_VISIBLE_LIMIT) && !forgeCompassPathActive(playerShip.position)) summonLeviathan();
  crates.slice().forEach((crate) => {
    if (dist2(playerShip.position, crate.mesh.position) < hullRadius + 1.1) collectCrate(crate);
  });
  updateWhalerNets();
}

function updateWalker(dt) {
  if (updateForgeWaterfallTransit(dt)) return;
  const island = islands.find((item) => item.name === state.dockedAt);
  if (!island) return;
  if (state.forgeOpen) {
    keys.clear();
    const groundY = islandGroundY(island, character.position) ?? island.landY;
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
    character.position.y = groundY;
    return;
  }
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  character.rotation.y += turn * dt * 2.45;
  state.cameraYaw = lerpAngle(state.cameraYaw, character.rotation.y, 0.18);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  if (throttle) {
    const forward = new THREE.Vector3(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
    const next = character.position.clone().add(forward.multiplyScalar(throttle * dt * 10.5));
    const groundY = walkableGroundY(island, next);
    if (groundY !== null) {
      character.position.x = next.x;
      character.position.z = next.z;
    } else if (!state.grounded && throttle > 0) {
      const rawGround = islandGroundY(island, next);
      if (rawGround !== null) {
        character.position.x = next.x;
        character.position.z = next.z;
        state.walkHeight = Math.max(state.walkHeight, Math.min(1.4, rawGround - character.position.y + 0.6));
      }
    }
  }
  const groundY = islandGroundY(island, character.position) ?? island.landY;
  const aboveGround = character.position.y - groundY;
  if (state.grounded && aboveGround > 0.28) {
    state.walkHeight = aboveGround;
    state.walkVelocityY = Math.min(state.walkVelocityY, 0);
    state.grounded = false;
  } else if (aboveGround < -0.18) {
    state.walkHeight = 0;
  }
  state.walkVelocityY -= 28 * dt;
  state.walkHeight += state.walkVelocityY * dt;
  if (state.walkHeight <= 0) {
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
  }
  const bob = state.grounded ? Math.sin(clock.elapsedTime * 5) * 0.035 : 0;
  character.position.y = groundY + state.walkHeight + bob;
}

function updateSeaWalker(dt) {
  if (state.viewMode !== "deck" && state.viewMode !== "swim") return;
  if (updateForgeWaterfallTransit(dt)) return;
  const turn = (keys.has("a") ? 1 : 0) - (keys.has("d") ? 1 : 0);
  character.rotation.y += turn * dt * 2.35;
  state.cameraYaw = lerpAngle(state.cameraYaw, character.rotation.y, 0.22);
  const throttle = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  const forward = new THREE.Vector3(Math.sin(character.rotation.y), 0, Math.cos(character.rotation.y));
  if (state.viewMode === "swim") {
    if (dist2(character.position, playerShip.position) < shipHitRadius(state.shipType) + 1.6 && keys.has("f")) {
      returnCharacterToShipDeck();
      return;
    }
    if (throttle) {
      const next = character.position.clone().add(forward.multiplyScalar(throttle * dt * 4.2));
      const swimLimit = hasCursedCompass() ? WATERFALL_LIMIT * 0.98 : MAP_LIMIT * 0.98;
      if (Math.abs(next.x) < swimLimit && Math.abs(next.z) < swimLimit) {
        const block = shipSwimBlockAt(next);
        const islandBlock = islandSwimBlockAt(next, 0.4);
        if (!block && !islandBlock) {
          character.position.x = next.x;
          character.position.z = next.z;
        } else if (block) {
          pushSwimmerAwayFromShip(block, dt);
        } else {
          pushSwimmerAwayFromIsland(islandBlock, dt);
        }
      }
    }
    character.position.y = 0.08 + Math.sin(clock.elapsedTime * 4.2) * 0.045;
    const currentBlock = shipSwimBlockAt(character.position);
    if (currentBlock) pushSwimmerAwayFromShip(currentBlock, dt);
    const currentIslandBlock = islandSwimBlockAt(character.position, 0.4);
    if (currentIslandBlock) pushSwimmerAwayFromIsland(currentIslandBlock, dt);
    return;
  }

  const currentLocal = playerShip.worldToLocal(character.position.clone());
  if (throttle) {
    const next = character.position.clone().add(forward.multiplyScalar(throttle * dt * 6.2));
    const local = playerShip.worldToLocal(next.clone());
    const nextSurface = shipWalkSurfaceAt(local, state.shipType, currentLocal.y);
    if (nextSurface) {
      character.position.x = next.x;
      character.position.z = next.z;
    } else if (!localPointOnShipDeck(local, state.shipType) && !shipStructureBarrierAt(local, state.shipType, currentLocal.y)) {
      character.position.x = next.x;
      character.position.z = next.z;
      state.grounded = false;
      state.walkVelocityY = Math.min(state.walkVelocityY, 0);
      state.walkHeight = Math.max(state.walkHeight, Math.max(0, currentLocal.y - shipDeckLocalY(state.shipType)));
    }
  }
  state.walkVelocityY -= 24 * dt;
  state.walkHeight += state.walkVelocityY * dt;
  if (state.walkHeight <= 0) {
    state.walkHeight = 0;
    if (state.grounded) state.walkVelocityY = 0;
  }
  const local = playerShip.worldToLocal(character.position.clone());
  const surface = shipWalkSurfaceAt(local, state.shipType, local.y);
  if (!surface) {
    if (localPointOnShipDeck(local, state.shipType)) {
      const deckPoint = deckWorldPosition(local.x, local.z, state.shipType);
      character.position.y = deckPoint.y + Math.sin(clock.elapsedTime * 5) * 0.018;
      state.walkHeight = 0;
      state.walkVelocityY = 0;
      state.grounded = true;
      return;
    }
    if (!state.grounded || character.position.y > 0.5) {
      state.grounded = false;
      character.position.y += state.walkVelocityY * dt;
    }
    if (character.position.y <= 0.18) {
      state.viewMode = "swim";
      resetCharacterHealth();
      character.position.y = 0.1;
      toast("You are swimming. Press F to return to your ship.");
    }
    return;
  }
  if (local.y <= surface.y + 0.08 && state.walkVelocityY <= 0) {
    state.walkHeight = 0;
    state.walkVelocityY = 0;
    state.grounded = true;
  } else {
    state.walkHeight = Math.max(0, local.y - surface.y);
  }
  const deckPoint = shipSurfaceWorldPosition(local.x, local.z, surface.y);
  character.position.y = deckPoint.y + state.walkHeight + Math.sin(clock.elapsedTime * 5) * 0.018;
}

function nearestBotEnemy(bot, maxDistance = 52) {
  let best = null;
  let bestDistance = maxDistance;
  bots.forEach((other) => {
    if (other === bot || other.hp <= 0) return;
    const distance = dist2(bot.group.position, other.group.position);
    if (distance < bestDistance) {
      best = other;
      bestDistance = distance;
    }
  });
  return best;
}

function startBotFeud(bot, enemy, seconds = 9) {
  if (!bot || !enemy) return;
  bot.targetBot = enemy.localId;
  bot.botFightUntil = clock.elapsedTime + seconds;
  if (Math.random() < 0.7) {
    enemy.targetBot = bot.localId;
    enemy.botFightUntil = clock.elapsedTime + seconds * 0.85;
  }
}

function botAimedTargetPoint(origin, targetPosition, targetVelocity = null, maxRange = BOT_CANNON_RANGE) {
  const target = targetPosition.clone();
  target.y = 0;
  const baseOffset = target.clone().sub(origin);
  baseOffset.y = 0;
  const distance = baseOffset.length();
  if (targetVelocity && distance > 0.01) {
    const leadTime = clamp(distance / CANNONBALL_SPEED, 0, 1.35);
    const lead = targetVelocity.clone();
    lead.y = 0;
    target.add(lead.multiplyScalar(leadTime * 0.82));
  }
  if (distance > 0.01) {
    const jitter = clamp(0.45 + distance * 0.012, 0.45, 1.4);
    target.x += (Math.random() - 0.5) * jitter;
    target.z += (Math.random() - 0.5) * jitter;
  }
  const offset = target.clone().sub(origin);
  offset.y = 0;
  const aimedDistance = offset.length();
  if (aimedDistance > maxRange && aimedDistance > 0.001) {
    target.copy(origin).add(offset.normalize().multiplyScalar(maxRange));
  }
  target.y = 0;
  return target;
}

function updateBots(dt) {
  if (multiplayer.serverWorld) {
    bots.forEach((bot, i) => {
      if (bot.serverPosition) {
        const predicted = bot.predictedPosition || (bot.predictedPosition = new THREE.Vector3());
        predicted.copy(bot.serverPosition);
        const age = clamp(clock.elapsedTime - (bot.serverUpdatedAt || clock.elapsedTime), 0, 0.24);
        if (bot.serverVelocity) predicted.addScaledVector(bot.serverVelocity, age);
        bot.velocity.copy(predicted).sub(bot.group.position).multiplyScalar(1 / Math.max(dt, 0.001));
        bot.group.position.lerp(predicted, clamp(dt * 10, 0, 0.42));
      }
      if (Number.isFinite(bot.serverRotation)) {
        bot.group.rotation.y = lerpAngle(bot.group.rotation.y, bot.serverRotation, clamp(dt * 7, 0, 0.32));
        bot.rotation = bot.group.rotation.y;
      }
      bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * BOT_SHIP_BOB;
      if (!bot.group.userData.renderCulled) {
        updateWhalerNetVisuals(bot.group, Boolean(bot.netsExtended), dt);
        updateTurtleFireVisual(bot.group, Boolean(bot.turtleFire), dt);
      }
      updateFireDamage(bot, dt, bot.velocity.length());
    });
    return;
  }
  bots.forEach((bot, i) => {
    const spec = getShipStats(bot.shipType);
    updateWhalerNetVisuals(bot.group, Boolean(bot.netsExtended), dt);
    const playerDistance = dist2(bot.group.position, playerShip.position);
    let aggressive = state.mode === "ship" && ((bot.agroUntil || 0) > clock.elapsedTime || (bot.naturallyAggressive && playerDistance < 34));
    const lowHealth = bot.hp < spec.hp * 0.58;
    let fightingBot = bot.targetBot && bot.botFightUntil > clock.elapsedTime
      ? bots.find((other) => other.localId === bot.targetBot && other.hp > 0)
      : null;
    if (!fightingBot && !aggressive && Math.random() < dt * 0.018) {
      fightingBot = nearestBotEnemy(bot, 54);
      if (fightingBot) startBotFeud(bot, fightingBot, 8 + Math.random() * 8);
    }
    let pickupTarget = nearestPickupTo(bot.group.position, lowHealth ? 250 : 215, bot);
    const pickupDistance = pickupTarget ? dist2(bot.group.position, pickupTarget.mesh.position) : Infinity;
    const valuablePickup = pickupTarget && (pickupTarget.kind === "treasure" || pickupTarget.kind === "kraken");
    const pickupChaseRange = pickupTarget?.kind === "treasure" ? 310 : pickupTarget?.kind === "kraken" ? 240 : 170;
    if (pickupTarget && (lowHealth || (!aggressive && !fightingBot) || (valuablePickup && pickupDistance < pickupChaseRange))) {
      if (lowHealth || valuablePickup) {
        aggressive = false;
        bot.agroUntil = 0;
        fightingBot = null;
        bot.targetBot = null;
        bot.botFightUntil = 0;
      }
    } else {
      pickupTarget = null;
    }
    const krakenEvade = activeKrakenEvadePoint(bot.group.position, bot.shipType);
    if (krakenEvade) {
      aggressive = false;
      bot.agroUntil = 0;
      fightingBot = null;
      bot.targetBot = null;
      bot.botFightUntil = 0;
      pickupTarget = null;
      bot.turn = Math.max(bot.turn, 2.4);
    }
    bot.turn -= dt;
    bot.fireCooldown = Math.max(0, (bot.fireCooldown || 0) - dt);
    const currentIslandBlocker = botIslandBlocker(bot.group.position, bot.shipType, 3);
    if (currentIslandBlocker) {
      pushBotOutsideIsland(bot, currentIslandBlocker.island, 4);
      bot.target = localBotIslandDetour(bot, currentIslandBlocker.island);
      bot.turn = Math.max(bot.turn, 2.8);
    }
    if (krakenEvade) {
      bot.target = krakenEvade;
    } else if (aggressive) {
      bot.target = playerShip.position.clone();
    } else if (fightingBot) {
      bot.target = fightingBot.group.position.clone();
    } else if (pickupTarget) {
      bot.target = pickupTarget.mesh.position.clone();
    } else if (bot.turn < 0) {
      bot.turn = 4 + Math.random() * 7;
      bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
    }
    let target = bot.target || playerShip.position;
    let toTarget = target.clone().sub(bot.group.position);
    toTarget.y = 0;
    let targetDistance = toTarget.length();
    if (!aggressive && !fightingBot && !pickupTarget && targetDistance < 9) {
      bot.velocity.multiplyScalar(Math.pow(0.62, dt * 3));
      bot.turn = 1.5 + Math.random() * 2.5;
      bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
      target = bot.target;
      toTarget = target.clone().sub(bot.group.position);
      toTarget.y = 0;
      targetDistance = toTarget.length();
    }
    const routeBlocker = targetDistance > 14 ? botRouteIslandBlocker(bot.group.position, target, bot.shipType, 5) : null;
    if (routeBlocker) {
      bot.target = localBotIslandDetour(bot, routeBlocker.island);
      bot.turn = Math.max(bot.turn, 2.4);
      target = bot.target;
      toTarget = target.clone().sub(bot.group.position);
      toTarget.y = 0;
      targetDistance = toTarget.length();
    }
    if (targetDistance > 5) {
      const avoidance = new THREE.Vector3();
      islands.forEach((island) => {
        if (island.forge) return;
        const away = bot.group.position.clone().sub(island.group.position);
        away.y = 0;
        const distance = away.length();
        const danger = island.radius + botIslandClearance(bot.shipType) + 18;
        if (distance > 0.001 && distance < danger) avoidance.add(away.normalize().multiplyScalar((danger - distance) / danger * 68));
        if ((aggressive || fightingBot || pickupTarget || krakenEvade) && distance > 0.001 && targetDistance > 0.01) {
          const route = toTarget.clone();
          const along = clamp(island.group.position.clone().sub(bot.group.position).dot(route) / Math.max(1, targetDistance * targetDistance), 0, 1);
          const closest = bot.group.position.clone().add(route.multiplyScalar(along));
          closest.y = SHIP_WATERLINE_Y;
          const clearance = dist2(closest, island.group.position);
          const routeDanger = island.radius + botIslandClearance(bot.shipType) + 8;
          if (along > 0.08 && along < 0.96 && clearance < routeDanger) {
            const normal = away.clone().normalize();
            const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
            const sign = tangent.dot(toTarget) >= 0 ? 1 : -1;
            avoidance.add(tangent.multiplyScalar(sign * ((routeDanger - clearance) / routeDanger) * 116));
          }
        }
      });
      if (!aggressive && !fightingBot) {
        const awayFromStarter = bot.group.position.clone().sub(starterIslandCenter());
        awayFromStarter.y = 0;
        const starterDistance = awayFromStarter.length();
        if (starterDistance > 0.001 && starterDistance < CENTER_BOT_CLEAR_RADIUS) {
          avoidance.add(awayFromStarter.normalize().multiplyScalar((CENTER_BOT_CLEAR_RADIUS - starterDistance) / CENTER_BOT_CLEAR_RADIUS * 64));
          if (!pickupTarget && targetDistance < CENTER_BOT_CLEAR_RADIUS * 0.7) {
            bot.target = randomTravelWaterPoint(MAP_LIMIT * 0.92);
            bot.turn = Math.max(bot.turn, 2.5);
          }
        }
      }
      const edgeMargin = 44;
      const edgeX = MAP_LIMIT - Math.abs(bot.group.position.x);
      const edgeZ = MAP_LIMIT - Math.abs(bot.group.position.z);
      if (edgeX < edgeMargin) avoidance.x += -Math.sign(bot.group.position.x || 1) * ((edgeMargin - edgeX) / edgeMargin) * 48;
      if (edgeZ < edgeMargin) avoidance.z += -Math.sign(bot.group.position.z || 1) * ((edgeMargin - edgeZ) / edgeMargin) * 48;
      const avoidShip = (position, type, weight = 1) => {
        const away = bot.group.position.clone().sub(position);
        away.y = 0;
        const distance = away.length();
        const danger = shipSeparationDistance(bot.shipType, type) + 9;
        if (distance > 0.001 && distance < danger) avoidance.add(away.normalize().multiplyScalar((danger - distance) / danger * 18 * weight));
      };
      if (state.mode === "ship") avoidShip(playerShip.position, state.shipType, aggressive ? 0.55 : 1);
      bots.forEach((other) => {
        if (other !== bot) avoidShip(other.group.position, other.shipType, fightingBot === other ? 0.28 : 0.75);
      });
      remotePlayers.forEach((remote) => {
        if (remote.group) avoidShip(remote.group.position, remote.shipType, 0.8);
      });
      if (krakenBoss?.alive && krakenBoss.group) {
        const head = krakenHeadWorldPosition();
        if (head) {
          const away = bot.group.position.clone().sub(head);
          away.y = 0;
          const krakenDistance = away.length();
          const danger = 48 + shipHitRadius(bot.shipType);
          if (krakenDistance > 0.001 && krakenDistance < danger) {
            avoidance.add(away.clone().normalize().multiplyScalar((danger - krakenDistance) / danger * (krakenEvade ? 130 : 54)));
            if (!krakenEvade && krakenDistance < 30 + shipHitRadius(bot.shipType) * 0.5) {
              aggressive = false;
              fightingBot = null;
              pickupTarget = null;
              bot.target = bot.group.position.clone().add(away.normalize().multiplyScalar(105));
              bot.turn = Math.max(bot.turn, 2.2);
            }
          }
        }
      }
      const steerTarget = toTarget.clone().add(avoidance);
      const baseDesired = Math.atan2(steerTarget.x, steerTarget.z);
      let desired = baseDesired;
      const inCombat = aggressive || Boolean(fightingBot);
      if (inCombat && targetDistance < botCannonRange(bot) * 1.25) {
        const aimSide = cannonSideForDirection(bot.rotation, steerTarget, bot.shipType);
        desired = shipUsesCenterlineGun(bot.shipType) ? baseDesired : baseDesired - aimSide.side * Math.PI / 2;
      }
      const delta = angleDelta(desired, bot.rotation);
      const chasingPickup = Boolean(pickupTarget);
      const evadingKraken = Boolean(krakenEvade);
      const speedTurnScale = clamp(spec.speed / 18, 0.48, 1.22);
      const turnRate = (evadingKraken ? 1.25 + spec.speed / 40 : inCombat ? 0.95 + spec.speed / 46 : chasingPickup ? 0.86 + spec.speed / 52 : 0.6 + spec.speed / 64) * speedTurnScale;
      const turnStep = clamp(delta, -dt * turnRate, dt * turnRate);
      bot.rotation += turnStep;
      const forward = new THREE.Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
      const facing = clamp(Math.cos(delta), 0.18, 1);
      const arrive = evadingKraken ? 1 : chasingPickup ? clamp(targetDistance / 14, 0.24, 1) : clamp(targetDistance / (inCombat ? 20 : 34), 0.18, 1);
      const pickupCruise = pickupTarget?.kind === "treasure" || pickupTarget?.kind === "kraken" ? 0.6 : 0.48;
      const cruise = evadingKraken ? 0.74 : inCombat ? 0.48 : chasingPickup ? pickupCruise : 0.28;
      const desiredVelocity = forward.multiplyScalar(spec.speed * cruise * facing * arrive);
      bot.velocity.lerp(desiredVelocity, clamp(dt * (evadingKraken ? 2.1 : inCombat ? 1.5 : chasingPickup ? 1.35 : 1.0), 0, evadingKraken ? 0.26 : 0.18));
      bot.velocity.multiplyScalar(Math.pow(0.92, dt * 3));
      const next = bot.group.position.clone().add(bot.velocity.clone().multiplyScalar(dt));
      const blockedIsland = botIslandBlocker(next, bot.shipType, 2) || botRouteIslandBlocker(bot.group.position, next, bot.shipType, 2);
      if (!blockedIsland) bot.group.position.copy(next);
      else {
        const normal = pushBotOutsideIsland(bot, blockedIsland.island, 3);
        const seed = bot.localId || bot.group.id || 0;
        const tangentSign = Math.sin(seed * 12.989 + clock.elapsedTime * 1.3) >= 0 ? 1 : -1;
        const tangent = new THREE.Vector3(-normal.z * tangentSign, 0, normal.x * tangentSign);
        bot.velocity.add(tangent.multiplyScalar(Math.min(spec.speed * 0.18, 1.7)));
        const away = Math.atan2(normal.x + tangent.x * 0.72, normal.z + tangent.z * 0.72);
        bot.rotation = lerpAngle(bot.rotation, away, 0.08);
        bot.target = localBotIslandDetour(bot, blockedIsland.island);
        bot.agroUntil = 0;
        bot.targetBot = null;
        bot.turn = 2 + Math.random() * 3;
      }
      bot.group.rotation.y = bot.rotation;
    }
    bot.group.position.y = SHIP_WATERLINE_Y + Math.sin(clock.elapsedTime * 2.4 + i) * BOT_SHIP_BOB;
    updateFireDamage(bot, dt, bot.velocity.length());
    botCollectCrates(bot);
    const shotTarget = aggressive ? playerShip : fightingBot?.group;
    const shotDir = shotTarget ? shotTarget.position.clone().sub(bot.group.position) : new THREE.Vector3();
    shotDir.y = 0;
    const shotDistance = shotDir.length();
    const botRange = botCannonRange(bot);
    if (shotTarget && bot.fireCooldown <= 0 && shotDistance <= botRange && shotDistance > 0.01) {
      const targetVelocity = fightingBot ? fightingBot.velocity : state.velocity;
      const origin = bot.group.position.clone();
      const targetPoint = botAimedTargetPoint(origin, shotTarget.position, targetVelocity, botRange);
      const broadside = cannonSideForDirection(bot.rotation, targetPoint.clone().sub(origin), bot.shipType);
      if (broadside.alignment > 0.72) {
        fireBroadsideVolley({
          owner: bot.localId,
          ship: bot.group,
          shipType: bot.shipType,
          sides: [broadside.side],
          ammo: CANNONBALL_TYPES.basic,
          range: botRange,
          baseDamage: botCannonDamage(bot),
          targetKind: fightingBot ? "bot" : "player",
          targetPoint,
        });
        bot.fireCooldown = botCannonReload(bot);
      }
    }
  });
}

function updateProjectiles(dt) {
  const now = Date.now();
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const shot = projectiles[i];
    if (now - (shot.createdWallAt || now) > (shot.maxWallAge || 4200)) {
      removeProjectile(shot);
      continue;
    }
    const previousPosition = projectilePreviousWorld.copy(shot.mesh.position);
    shot.traveled += shot.speed * dt;
    const progress = clamp(shot.traveled / shot.distance, 0, 1);
    if (shot.ballistic) {
      shot.mesh.position.copy(shot.start).addScaledVector(shot.dir, shot.traveled);
      const flightTime = shot.traveled / Math.max(0.001, shot.speed);
      shot.mesh.position.y = shot.start.y + (shot.verticalVelocity || 0) * flightTime - 0.5 * (shot.gravity || CANNONBALL_GRAVITY) * flightTime * flightTime;
    } else {
      shot.mesh.position.lerpVectors(shot.start, shot.target, progress);
    }
    if (!shot.airburst && !shot.ballistic) {
      shot.mesh.position.y = 1.05 + Math.sin(progress * Math.PI) * shot.arcHeight + Math.sin(clock.elapsedTime * 16) * 0.08;
    } else if (shot.airburst) {
      shot.mesh.position.y += Math.sin(progress * Math.PI) * 1.8;
    }
    if (shot.ammoType === "rocketburst") {
      shot.mesh.rotation.y += dt * 10;
      shot.sparkTimer = (shot.sparkTimer || 0) - dt;
      if (shot.sparkTimer <= 0) {
        shot.sparkTimer = shot.remote ? 0.13 + Math.random() * 0.08 : 0.045 + Math.random() * 0.035;
        const sparkGroup = new THREE.Group();
        const sparkCount = shot.remote ? 1 : 2 + Math.floor(Math.random() * 3);
        for (let s = 0; s < sparkCount; s++) {
          const sparkSize = 0.055 + Math.random() * 0.045;
          const sparkColor = Math.random() > 0.45 ? 0xffd35c : 0xff6f2a;
          const spark = new THREE.Mesh(sharedSparkGeometry(), sharedSparkMaterial(sparkColor));
          spark.scale.setScalar(sparkSize);
          spark.position.copy(shot.mesh.position).add(shot.dir.clone().multiplyScalar(-0.35 - Math.random() * 0.25));
          spark.position.x += (Math.random() - 0.5) * 0.18;
          spark.position.y += (Math.random() - 0.5) * 0.18;
          spark.position.z += (Math.random() - 0.5) * 0.18;
          sparkGroup.add(spark);
        }
        addImpactEffect(sparkGroup, 0.32);
      }
    }
    const trailPositions = shot.trailPositions;
    if (trailPositions) {
      if (shot.trailPointCount < 7) {
        const index = shot.trailPointCount * 3;
        trailPositions[index] = shot.mesh.position.x;
        trailPositions[index + 1] = shot.mesh.position.y;
        trailPositions[index + 2] = shot.mesh.position.z;
        shot.trailPointCount++;
        shot.trail.geometry.setDrawRange(0, shot.trailPointCount);
      } else {
        trailPositions.copyWithin(0, 3);
        trailPositions[18] = shot.mesh.position.x;
        trailPositions[19] = shot.mesh.position.y;
        trailPositions[20] = shot.mesh.position.z;
      }
      shot.trail.geometry.attributes.position.needsUpdate = true;
    }
    shot.trail.material.opacity = 0.28 + 0.34 * (1 - progress);
    if (shot.ballistic && shot.mesh.position.y <= 0.02 && shot.traveled > 1.2) {
      shot.target.copy(shot.mesh.position).setY(0);
      removeProjectile(shot, "splash");
      continue;
    }
    if (shot.airburst && progress >= 0.92) {
      detonateAirburst(shot);
      removeProjectile(shot);
      continue;
    }
    let hit = false;
    if (shot.owner === playerId) {
      animals.forEach((animal) => {
        if (!hit && projectileHitsAnimal(shot, animal)) {
          damageAnimal(animal, shot);
          hit = true;
        }
      });
      if (shot.ammoType !== "airburst") {
        bots.forEach((bot) => {
          if (!hit && projectileHitsShip(shot, bot.group, bot.shipType)) {
            const hitPosition = shot.mesh.position.clone();
            const impactDamage = projectileDamageAtImpact(shot);
            if (multiplayer.serverWorld && bot.serverId) {
              sendMultiplayer({ type: "hitBot", id: bot.serverId, damage: impactDamage, fire: shot.fire || null });
              if (shot.fire) igniteTarget(bot, shot.fire, hitPosition, true);
            } else {
              damageTarget(bot, impactDamage, { fire: shot.fire, hitPosition });
            }
            addXP(1 + Math.floor(impactDamage / 27));
            hit = true;
          }
        });
        remotePlayers.forEach((remote) => {
          if (!hit && projectileHitsShip(shot, remote.group, remote.shipType)) {
            const impactDamage = projectileDamageAtImpact(shot);
            if (remote.mode !== "land") addXP(2 + Math.floor(impactDamage / 24));
            if (shot.fire) igniteTarget(remote, shot.fire, shot.mesh.position.clone(), true);
            hit = true;
          }
        });
        if (!hit && projectileHitsKraken(shot, previousPosition)) {
          const impactDamage = projectileDamageAtImpact(shot);
          if (!multiplayer.serverWorld) krakenBoss.hp = Math.max(0, (krakenBoss.hp || 0) - impactDamage);
          hit = true;
        }
      }
    } else {
      if (shot.targetKind !== "bot") {
        if (projectileHitsCharacter(shot)) {
          damageCharacter(CHARACTER_MAX_HP, { hitPosition: shot.mesh.position.clone() });
          hit = true;
        } else if (state.mode === "ship" && projectileHitsShip(shot, playerShip, state.shipType)) {
          damageTarget(state, projectileDamageAtImpact(shot), { fire: shot.fire, hitPosition: shot.mesh.position.clone() });
          hit = true;
        }
        ownedShips.forEach((ship) => {
          if (!hit && projectileHitsShip(shot, ship.group, ship.type)) {
            damageOwnedShip(ship, projectileDamageAtImpact(shot), { fire: shot.fire, hitPosition: shot.mesh.position.clone() });
            hit = true;
          }
        });
      }
      if (!hit && shot.targetKind !== "player") {
        bots.forEach((bot) => {
          if (!hit && bot.localId !== shot.owner && projectileHitsShip(shot, bot.group, bot.shipType)) {
            if (!multiplayer.serverWorld) {
              damageTarget(bot, projectileDamageAtImpact(shot), { fire: shot.fire, hitPosition: shot.mesh.position.clone() });
            } else if (shot.fire) {
              igniteTarget(bot, shot.fire, shot.mesh.position.clone(), true);
            }
            hit = true;
          }
        });
      }
      if (!hit && shot.ammoType !== "airburst" && projectileHitsKraken(shot, previousPosition)) {
        hit = true;
      }
    }
    if (progress >= 1 || hit) {
      removeProjectile(shot, hit ? "hit" : "splash");
    }
  }
}

function updateKrakenAttackEffect(effect, t) {
  const ease = (value) => value * value * (3 - 2 * value);
  const rise = ease(clamp(t / 0.36, 0, 1));
  const slam = ease(clamp((t - (KRAKEN_SLAM_T - 0.06)) / 0.12, 0, 1));
  const after = ease(clamp((t - KRAKEN_SLAM_T) / 0.22, 0, 1));
  effect.group.children.forEach((child) => {
    if (child.userData.krakenAttackTentacle) {
      child.visible = true;
      const curve = krakenAttackCurve(child.userData.attackData, t);
      child.geometry.dispose();
      child.geometry = makeTaperedTubeGeometry(curve, child.userData.baseRadius, child.userData.tipRadius, child.userData.tubeOptions);
      effect.group.userData.latestAttackCurve = curve;
    }
    if (child.userData.krakenAttackSucker) {
      const curve = effect.group.userData.latestAttackCurve;
      if (!curve) return;
      const point = curve.getPoint(clamp(child.userData.curveT, 0, 1));
      child.visible = t > 0.08 && point.y > -6;
      child.position.copy(point);
      child.position.y -= 0.42;
      const scale = 0.68 + rise * 0.32;
      child.scale.set(1, 0.28, 0.86).multiplyScalar(scale);
    }
    if (child.userData.krakenRiseSplash) {
      child.visible = t < 0.52;
      const scale = 0.8 + rise * 2.9;
      child.scale.set(scale, scale, scale);
      child.material.opacity = Math.max(0, 0.58 * (1 - rise));
    }
    if (child.userData.krakenSplash) {
      child.visible = t >= KRAKEN_SLAM_T;
      const scale = 0.9 + slam * 0.65 + after * 2.0;
      child.scale.set(scale, scale, scale);
      child.material.opacity = Math.max(0, 0.92 * (1 - after));
    }
    if (child.userData.krakenWaterWall) {
      const local = clamp((t - KRAKEN_SLAM_T) / 0.48, 0, 1);
      child.visible = local > 0 && local < 1;
      const surge = ease(clamp(local / 0.42, 0, 1));
      const fall = ease(clamp((local - 0.32) / 0.68, 0, 1));
      child.scale.y = 0.35 + surge * 1.35;
      child.scale.x = 0.8 + local * 0.65;
      child.position.y = child.userData.baseY + surge * 5.2 - fall * 7.8;
      child.material.opacity = Math.max(0, 0.72 * (1 - fall));
    }
    if (child.userData.krakenSlamSpray) {
      const local = clamp((t - KRAKEN_SLAM_T) / 0.44, 0, 1);
      child.visible = local > 0 && local < 1;
      child.position.copy(child.userData.start);
      child.position.addScaledVector(child.userData.velocity, local);
      child.position.y = child.userData.start.y + child.userData.velocity.y * local - 15.5 * local * local;
      child.material.opacity = Math.max(0, 0.9 * (1 - local));
    }
  });
}

function updateImpactEffects(dt) {
  const nowWall = Date.now();
  for (let i = impactEffects.length - 1; i >= 0; i--) {
    const effect = impactEffects[i];
    const wallAge = Number.isFinite(effect.bornWall) ? Math.max(0, (nowWall - effect.bornWall) / 1000) : 0;
    effect.age = Math.max(effect.age + dt, wallAge);
    const t = clamp(effect.age / effect.life, 0, 1);
    const fade = 1 - t;
    if (effect.group.userData.krakenAttack) updateKrakenAttackEffect(effect, t);
    effect.group.children.forEach((child) => {
      if (effect.group.userData.krakenAttack && (
        child.userData.krakenAttackTentacle
        || child.userData.krakenAttackSucker
        || child.userData.krakenRiseSplash
        || child.userData.krakenSplash
        || child.userData.krakenWaterWall
        || child.userData.krakenSlamSpray
      )) return;
      if (child.userData.velocity) {
        child.position.addScaledVector(child.userData.velocity, dt);
        child.userData.velocity.y -= 8.5 * dt;
      }
      if (child.userData.spin) {
        child.rotation.x += child.userData.spin.x * dt;
        child.rotation.y += child.userData.spin.y * dt;
        child.rotation.z += child.userData.spin.z * dt;
      }
      if (child.userData.puff) {
        const scale = 1 + t * 2.6;
        child.scale.setScalar(scale);
      } else if (child.geometry?.type === "RingGeometry") {
        const scale = 1 + t * 2.8;
        child.scale.set(scale, scale, scale);
      }
      if (child.material) child.material.opacity = Math.max(0, fade * (child.userData.puff ? 0.45 : 0.9));
    });
    if (effect.age >= effect.life || (Number.isFinite(effect.maxWallAge) && nowWall - effect.bornWall > effect.maxWallAge)) {
      scene.remove(effect.group);
      effect.group.traverse((obj) => {
        if (obj.geometry) disposeMaybeShared(obj.geometry);
        if (Array.isArray(obj.material)) obj.material.forEach(disposeMaybeShared);
        else if (obj.material) disposeMaybeShared(obj.material);
      });
      impactEffects.splice(i, 1);
    }
  }
}

function disposeTransientObject(object) {
  if (!object) return;
  scene.remove(object);
  object.traverse?.((child) => {
    if (child.geometry) disposeMaybeShared(child.geometry);
    if (Array.isArray(child.material)) child.material.forEach(disposeMaybeShared);
    else if (child.material) disposeMaybeShared(child.material);
  });
}

function clearPastTransientEffects() {
  impactEffects.splice(0).forEach((effect) => disposeTransientObject(effect.group));
  balloonBombs.splice(0).forEach((bomb) => disposeTransientObject(bomb.mesh));
  waveHazards.length = 0;
  activeKrakenAttacks.length = 0;
  krakenBoss?.group?.children.forEach((child) => {
    if (!child.userData?.tentacle) return;
    delete child.userData.submergeStart;
    delete child.userData.submergeUntil;
    delete child.userData.submergeDepth;
    child.visible = true;
  });
}

function setupTransientResumeCleanup() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tabHiddenAt = Date.now();
      return;
    }
    if (tabHiddenAt && Date.now() - tabHiddenAt > 1400) clearPastTransientEffects();
    syncActionCooldowns();
    if (state.docking?.endAt) state.docking.remaining = timerRemainingSeconds(state.docking.endAt);
    if (state.joined) {
      updateTurtleFireTimers(0);
      updateRocketeerBurst(0);
      nextHudUpdateAt = 0;
      updateHud();
    }
    tabHiddenAt = 0;
  });
}

function updateFish(dt) {
  const bait = state.fishing?.phase === "waiting" ? fishingBobber?.position : null;
  const fishFocus = lightingFocusPosition();
  let serverFishVisualDt = dt;
  let updateServerFishVisuals = true;
  if (multiplayer.serverWorld) {
    serverFishVisualAccumulator += dt;
    updateServerFishVisuals = Boolean(bait) || serverFishVisualAccumulator >= SERVER_FISH_VISUAL_INTERVAL;
    if (updateServerFishVisuals) {
      serverFishVisualDt = Math.min(0.18, Math.max(dt, serverFishVisualAccumulator));
      serverFishVisualAccumulator = 0;
    }
  }
  fish.forEach((item) => {
    const fishPoint = item.userData.serverPosition || item.position;
    const fishVisible = !fishFocus || distSq2(fishPoint, fishFocus) <= FISH_RENDER_DISTANCE_SQ || (bait && distSq2(fishPoint, bait) < 55 * 55);
    if (item.visible !== fishVisible) item.visible = fishVisible;
    if (item.userData.serverId && multiplayer.serverWorld) {
      if (!fishVisible && !bait) {
        if (item.userData.serverPosition) item.position.copy(item.userData.serverPosition);
        return;
      }
      if (!updateServerFishVisuals) return;
      item.userData.phase += serverFishVisualDt;
      const direction = Number.isFinite(Number(item.userData.serverDirection)) ? Number(item.userData.serverDirection) : item.userData.direction || 0;
      item.userData.direction = direction;
      if (item.userData.serverPosition) {
        const visualTarget = item.userData.visualTarget || (item.userData.visualTarget = item.position.clone());
        const age = clamp(clock.elapsedTime - (item.userData.serverUpdatedAt || clock.elapsedTime), 0, 0.32);
        const speed = item.userData.speed || 8;
        visualTarget.copy(item.userData.serverPosition);
        visualTarget.x += Math.sin(direction) * speed * age;
        visualTarget.z += Math.cos(direction) * speed * age;
        item.position.lerp(visualTarget, clamp(serverFishVisualDt * 10, 0, 0.42));
      }
      if (bait && !item.userData.pending && state.fishing) {
        const catchRadius = fishHitRadius(item) + 0.72;
        if (distSq2(item.position, bait) < catchRadius * catchRadius) {
          state.fishing.target = item;
          state.fishing.phase = "reeling";
          state.fishing.timer = 0;
          toast(`${item.userData.kind === "squid" ? "Squid" : "Fish"} on the line!`);
        }
      }
      item.rotation.y = direction;
      const pulse = 1 + Math.sin(item.userData.phase * 5) * 0.12;
      item.scale.set(pulse, 1, pulse);
      return;
    }
    if (!fishVisible && !bait) return;
    item.userData.phase += dt;
    let direction = item.userData.direction || 0;
    if (bait && dist2(item.position, bait) < (item.userData.kind === "squid" ? 45 : 30)) {
      direction = Math.atan2(bait.x - item.position.x, bait.z - item.position.z);
      item.userData.direction = lerpAngle(item.userData.direction || direction, direction, clamp(dt * 2.2, 0, 0.18));
      const catchRadius = fishHitRadius(item) + 0.72;
      if (distSq2(item.position, bait) < catchRadius * catchRadius && state.fishing) {
        state.fishing.target = item;
        state.fishing.phase = "reeling";
        state.fishing.timer = 0;
        toast(`${item.userData.kind === "squid" ? "Squid" : "Fish"} on the line!`);
      }
    } else if (Math.random() < dt * 0.28) {
      item.userData.direction += (Math.random() - 0.5) * 0.9;
    }
    direction = item.userData.direction || direction;
    const speed = item.userData.speed || 8;
    const next = item.position.clone();
    next.x += Math.sin(direction) * speed * dt;
    next.z += Math.cos(direction) * speed * dt;
    const hitRadius = fishHitRadius(item);
    if (Math.abs(next.x) > MAP_LIMIT * 0.95 || Math.abs(next.z) > MAP_LIMIT * 0.95 || pointInAnyIsland(next, hitRadius + 5)) {
      item.userData.direction += Math.PI * (0.85 + Math.random() * 0.3);
      item.position.x = clamp(item.position.x, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
      item.position.z = clamp(item.position.z, -MAP_LIMIT * 0.94, MAP_LIMIT * 0.94);
    } else {
      item.position.copy(next);
    }
    item.rotation.y = direction;
    const pulse = 1 + Math.sin(item.userData.phase * 5) * 0.12;
    item.scale.set(pulse, 1, pulse);
  });
  if (state.fishing) {
    state.fishing.timer += dt;
    const targetPos = state.fishing.target?.position || state.fishing.castPoint;
    if (state.fishing.phase === "waiting") {
      fishingBobber.position.copy(state.fishing.castPoint);
      fishingBobber.position.y = 0.2 + Math.sin(clock.elapsedTime * 9) * 0.12;
    } else {
      const t = clamp(state.fishing.timer / state.fishing.reelTime, 0, 1);
      const shipTip = playerShip.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      fishingBobber.position.lerpVectors(targetPos, shipTip, t);
      fishingBobber.position.y = 0.25 + Math.sin(clock.elapsedTime * 18) * 0.2;
      if (t >= 1) finishFishing();
    }
    if (fishingLine && fishingBobber) {
      setCylinderBetween(
        fishingLine,
        playerShip.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
        fishingBobber.position.clone()
      );
    }
  }
  if (!multiplayer.serverWorld) {
    treasureSpawnTimer -= dt;
    if (treasureSpawnTimer <= 0) {
      treasureSpawnTimer = 28 + Math.random() * 42;
      const treasureCount = crates.filter((crate) => crate.kind === "treasure").length;
      if (treasureCount < MAX_TREASURES && Math.random() < 0.45) spawnTreasure();
    }
  }
  crates.slice().forEach((crate) => {
    if (crate.born === undefined) crate.born = clock.elapsedTime;
    if (crate.velocity?.lengthSq?.() > 0.001) {
      const next = crate.mesh.position.clone().add(crate.velocity.clone().multiplyScalar(dt));
      if (Math.abs(next.x) < MAP_LIMIT * 0.98 && Math.abs(next.z) < MAP_LIMIT * 0.98 && !pointInAnyIsland(next, 4)) {
        crate.mesh.position.x = next.x;
        crate.mesh.position.z = next.z;
      } else {
        crate.velocity.multiplyScalar(-0.22);
      }
      crate.velocity.multiplyScalar(Math.pow(0.16, dt));
      if (crate.velocity.lengthSq() < 0.01) crate.velocity.set(0, 0, 0);
    }
    crate.mesh.rotation.y += dt * (crate.kind === "treasure" || crate.kind === "kraken" ? 0.92 : 0.65);
    const age = clock.elapsedTime - crate.born;
    const lifetime = crate.kind === "kraken" ? CRATE_LIFETIME * 4 : crate.kind === "whale" ? WHALE_BIT_LIFETIME : CRATE_LIFETIME;
    const sink = clamp((age - lifetime) / CRATE_SINK_TIME, 0, 1);
    const baseY = crate.kind === "kraken" ? 0.54 : crate.kind === "treasure" ? 0.78 : crate.kind === "whale" ? 0.48 : 0.72;
    crate.mesh.position.y = baseY + Math.sin(clock.elapsedTime * 2 + crate.mesh.id) * 0.1 - sink * 1.8;
    const baseScale = crate.kind === "kraken" ? 1.2 : crate.kind === "treasure" ? 1.08 : crate.kind === "whale" ? 0.72 : 1;
    crate.mesh.scale.setScalar(baseScale * (1 - sink * 0.35));
    if (!crate.serverId && age > lifetime + CRATE_SINK_TIME) removeCrate(crate);
  });
}

function updateLeviathan(dt) {
  if (!leviathan?.group) return;
  const age = clock.elapsedTime - leviathan.born;
  const ease = (value) => value * value * (3 - 2 * value);
  const sideDir = leviathan.sideDir || new THREE.Vector3(1, 0, 0);
  const jawForward = sideDir.clone().multiplyScalar(-1);
  const serverControlled = Boolean(leviathan.serverControlled);
  leviathan.group.rotation.y = Math.atan2(sideDir.x, sideDir.z);

  const leapDuration = 3.15;
  if (!leviathan.crushed) {
    if (!serverControlled && age < 2.75 && state.mode === "ship") {
      const liveTarget = playerShip.position.clone();
      liveTarget.y = 0;
      leviathan.impactPoint.lerp(liveTarget, clamp(dt * 5.6, 0, 0.7));
      leviathan.smashPosition.copy(leviathan.impactPoint).add(sideDir.clone().multiplyScalar(8.6));
      leviathan.smashPosition.y = 0.55;
      leviathan.divePosition.copy(leviathan.impactPoint).add(sideDir.clone().multiplyScalar(-30));
      leviathan.divePosition.y = -24;
    }

    const leapT = ease(clamp(age / leapDuration, 0, 1));
    const leapPosition = leviathan.startPosition.clone().lerp(leviathan.smashPosition, leapT);
    leapPosition.y = leviathan.startPosition.y
      + (leviathan.smashPosition.y - leviathan.startPosition.y) * leapT
      + Math.sin(leapT * Math.PI) * 43;
    leviathan.group.position.copy(leapPosition);
    const arcLift = Math.sin(leapT * Math.PI);
    const tipDown = ease(clamp((leapT - 0.12) / 0.82, 0, 1));
    const slamLean = ease(clamp((age - 2.48) / 0.58, 0, 1));
    leviathan.group.rotation.z = Math.sin(clock.elapsedTime * 3.1) * 0.065 * (1 - slamLean);
    leviathan.group.rotation.x = (0.48 * (1 - tipDown) - 1.0 * tipDown + arcLift * 0.14) * (1 - slamLean) - 1.18 * slamLean;
    leviathan.group.scale.setScalar(1.06 + arcLift * 0.22 + slamLean * 0.12);
    setLeviathanJawOpen(leviathan.group, 0.95 - slamLean * 0.28);

    if (age >= leapDuration) {
      leviathan.crushed = true;
      leviathan.slamAt = clock.elapsedTime;
      if (serverControlled) return;
      const hit = state.mode === "ship" && leviathanAttackHits(playerShip.position, leviathan.impactPoint, sideDir, state.shipType);
      if (hit) {
        state.leviathanGrabbed = true;
        state.velocity.set(0, 0, 0);
        playerShip.position.copy(leviathan.impactPoint);
        playerShip.position.y = SHIP_WATERLINE_Y + 0.18;
        state.position.copy(playerShip.position);
        makeSplinterEffect(playerShip.position.clone().add(new THREE.Vector3(0, 1.0, 0)), jawForward);
        playerShip.visible = false;
      } else {
        leviathan.missed = true;
      }
      makeLeviathanAttackEffect(leviathan.impactPoint.clone().setY(0), sideDir, hit ? "crush" : "miss");
    }
    return;
  }

  const slamAge = clock.elapsedTime - leviathan.slamAt;
  const diveT = ease(clamp(slamAge / 2.25, 0, 1));
  const divePosition = leviathan.smashPosition.clone().lerp(leviathan.divePosition, diveT);
  divePosition.y = leviathan.smashPosition.y
    + (leviathan.divePosition.y - leviathan.smashPosition.y) * diveT
    + Math.sin(diveT * Math.PI) * 5.5;
  leviathan.group.position.copy(divePosition);
  leviathan.group.rotation.z = Math.sin(clock.elapsedTime * 4.6) * 0.045 * (1 - diveT);
  leviathan.group.rotation.x = -1.18 + diveT * 1.36;
  leviathan.group.scale.setScalar(1.18 - diveT * 0.16);
  setLeviathanJawOpen(leviathan.group, 0.67 - diveT * 0.26, diveT * 0.1);

  if (state.leviathanGrabbed && !leviathan.damaged && (!serverControlled || leviathan.serverHit)) {
    state.velocity.set(0, 0, 0);
    state.position.copy(playerShip.position);
  }

  if (!serverControlled && !leviathan.missed && !leviathan.damaged && slamAge > 0.48) {
    leviathan.damaged = true;
    damageTarget(state, maxHp() * 4);
  }

  if (slamAge > 2.45 || age > 6.4) {
    state.leviathanGrabbed = false;
    scene.remove(leviathan.group);
    leviathan = null;
  }
}

function updateKraken(dt) {
  if (!krakenBoss?.group) return;
  const ease = (value) => value * value * (3 - 2 * value);
  const now = clock.elapsedTime;
  const nowWall = Date.now() / 1000;
  if (krakenBoss.alive) {
    krakenBoss.group.position.y = Math.sin(clock.elapsedTime * 0.58) * 0.18;
  }
  krakenBoss.group.children.forEach((child) => {
    if (child.userData?.tentacle) {
      const started = child.userData.submergeStart;
      let dive = 0;
      if (Number.isFinite(started)) {
        const until = child.userData.submergeUntil || started + KRAKEN_ATTACK_LIFE * 0.82;
        const down = ease(clamp((nowWall - started) / 0.8, 0, 1));
        const up = ease(clamp((nowWall - until) / 1.25, 0, 1));
        dive = down * (1 - up);
        if (nowWall > until + 1.35) {
          delete child.userData.submergeStart;
          delete child.userData.submergeUntil;
          delete child.userData.submergeDepth;
        }
      }
      child.visible = dive < 0.72;
      if (!Number.isFinite(child.userData.homeX)) {
        child.userData.homeX = child.position.x;
        child.userData.homeZ = child.position.z;
      }
      const sway = Math.sin(now * 0.46 + child.userData.phase) * 0.28;
      const bob = Math.sin(now * 0.82 + child.userData.phase) * 0.34;
      child.position.y = (child.userData.homeY || 0) + bob - dive * (child.userData.submergeDepth || 18);
      child.position.x = child.userData.homeX + Math.sin(now * 0.31 + child.userData.phase) * 0.18;
      child.position.z = child.userData.homeZ + Math.cos(now * 0.28 + child.userData.phase) * 0.18;
      child.rotation.x = Math.sin(now * 0.54 + child.userData.phase) * 0.07 + dive * 0.18;
      child.rotation.y = Math.sin(now * 0.7 + child.userData.phase) * 0.13 + sway * 0.05;
      child.rotation.z = Math.cos(now * 0.52 + child.userData.phase) * 0.09;
    }
    if (child.userData?.krakenWaterRing) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.4 + child.userData.phase) * 0.12;
      child.scale.set(pulse, pulse, pulse);
      child.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.8 + child.userData.phase) * 0.08;
    }
  });
}

function faceLabelsToCamera() {
  for (let i = 0; i < labels.length; i++) labels[i].lookAt(camera.position);
}

function updateCamera(dt) {
  if (keys.has("arrowleft")) state.cameraYaw += 1.9 * dt;
  if (keys.has("arrowright")) state.cameraYaw -= 1.9 * dt;
  if (keys.has("arrowup")) state.cameraPitch = clamp(state.cameraPitch + 0.55 * dt, -0.18, 0.92);
  if (keys.has("arrowdown")) state.cameraPitch = clamp(state.cameraPitch - 0.55 * dt, -0.18, 0.92);
  camera.up.set(0, 1, 0);
  if (state.fallingOffWorld && playerShip) {
    if (character) character.visible = false;
    const target = playerShip.position;
    const cameraHeight = 16 + clamp(state.cameraPitch, -0.18, 0.92) * 18;
    const orbitRadius = 38;
    scratchV1.set(Math.sin(state.cameraYaw) * orbitRadius, cameraHeight, Math.cos(state.cameraYaw) * orbitRadius);
    scratchV2.copy(target).add(scratchV1);
    camera.position.lerp(scratchV2, 0.14);
    camera.lookAt(target.x, target.y, target.z);
    faceLabelsToCamera();
    return;
  }
  if (state.viewMode === "deck" || state.viewMode === "swim") {
    if (character) character.visible = false;
    const swim = state.viewMode === "swim";
    const eyeHeight = swim ? 0.24 : CHARACTER_EYE_HEIGHT;
    scratchV1.copy(character.position);
    scratchV1.y += eyeHeight;
    if (swim) scratchV1.y = Math.max(0.22, scratchV1.y);
    const pitch = swim ? clamp(state.cameraPitch * 0.58, 0.02, 0.48) : clamp(state.cameraPitch * 0.75 - 0.12, -0.18, 0.58);
    scratchV2.set(Math.sin(character.rotation.y), pitch, Math.cos(character.rotation.y)).normalize().multiplyScalar(16).add(scratchV1);
    camera.position.lerp(scratchV1, 0.36);
    camera.lookAt(scratchV2);
    faceLabelsToCamera();
    return;
  }
  if (state.mode === "land") {
    if (character) character.visible = false;
    scratchV1.copy(character.position);
    scratchV1.y += CHARACTER_EYE_HEIGHT;
    const yaw = character.rotation.y;
    scratchV2.set(Math.sin(yaw), clamp(state.cameraPitch * 0.75 - 0.12, -0.28, 0.58), Math.cos(yaw)).normalize().multiplyScalar(16).add(scratchV1);
    camera.position.lerp(scratchV1, 0.36);
    camera.lookAt(scratchV2);
    faceLabelsToCamera();
    return;
  }
  if (character) character.visible = false;
  const balloon = activeBalloon();
  if (balloon && !balloon.destroyed) {
    camera.up.set(0, 0, -1);
    const height = clamp(54 + state.cameraPitch * 18, 48, 72);
    scratchV1.copy(balloon.group.position);
    scratchV1.y += height;
    camera.position.lerp(scratchV1, 0.18);
    camera.lookAt(balloon.group.position.x, balloon.group.position.y - 18, balloon.group.position.z + 0.01);
    faceLabelsToCamera();
    return;
  }
  const target = state.mode === "ship" ? playerShip.position : character.position;
  const cameraHeight = clamp(22 + state.cameraPitch * 48, 8, 70);
  const orbitRadius = clamp(62 - state.cameraPitch * 18, 36, 68);
  scratchV1.set(Math.sin(state.cameraYaw) * orbitRadius, cameraHeight, Math.cos(state.cameraYaw) * orbitRadius);
  scratchV2.copy(target).add(scratchV1);
  scratchV2.y = Math.max(2.8, scratchV2.y);
  camera.position.lerp(scratchV2, 0.08);
  camera.lookAt(target.x, target.y + clamp(state.cameraPitch * 6, 0, 7), target.z);
  faceLabelsToCamera();
}

function updateHud() {
  if (state.infiniteGold) state.gold = 999999999;
  if (state.infiniteLevels) {
    state.level = Math.max(state.level, 999999);
    state.points = Math.max(state.points, 999999);
    state.xp = 0;
  }
  const spec = getShipStats();
  const levelLabel = state.infiniteLevels
    ? t("lvlInfinite")
    : state.level >= MAX_PLAYER_LEVEL
      ? t("lvlMax", { level: MAX_PLAYER_LEVEL })
      : t("lvl", { level: state.level });
  const nameText = captainName();
  if (nameText !== hudNameText) {
    hudNameText = nameText;
    setTextIfChanged(ui.playerName, nameText);
  }
  if (levelLabel !== hudLevelText) {
    hudLevelText = levelLabel;
    setTextIfChanged(ui.playerLevel, levelLabel);
  }
  const hpWidth = `${clamp((state.hp / maxHp()) * 100, 0, 100).toFixed(2)}%`;
  if (hpWidth !== hudHpWidth) {
    hudHpWidth = hpWidth;
    setWidthIfChanged(ui.hpBar, hpWidth);
  }
  const hpText = `${Math.ceil(state.hp)}/${spec.hp}`;
  if (hpText !== hudHpText) {
    hudHpText = hpText;
    setTextIfChanged(ui.hpCounter, hpText);
  }
  const xpWidth = state.infiniteLevels || state.level >= MAX_PLAYER_LEVEL ? "100%" : `${clamp((state.xp / xpForLevel(state.level)) * 100, 0, 100).toFixed(2)}%`;
  if (xpWidth !== hudXpWidth) {
    hudXpWidth = xpWidth;
    setWidthIfChanged(ui.xpBar, xpWidth);
  }
  const fireLabel = state.fire ? ` | ${t("burning", { seconds: Math.ceil(state.fire.remaining) })}` : "";
  const blubberLabel = state.shipType === "whaler"
    ? ` | ${t("blubber")} ${blubberCount()}/${blubberCapacity()}`
    : blubberCount() > 0
      ? ` | ${t("blubber")} ${blubberCount()}`
      : "";
  const netLabel = state.shipType === "whaler" ? ` | ${t("nets")} ${state.whalerNets ? t("out") : t("in")}` : "";
  const turtleStatus = state.turtleFire
    ? `Fire ${Math.ceil(state.turtleFireTimer || 0)}s`
    : (state.turtleFireCooldown || 0) > 0
      ? `Fire cooldown ${Math.ceil(state.turtleFireCooldown)}s`
      : "Fire ready";
  const turtleLabel = state.shipType === "turtle" ? ` | ${turtleStatus}` : "";
  const rocketStatus = state.rocketBurst
    ? `Burst shots ${ROCKET_BURST_COUNT - rocketBurstShotsRemaining()}/${ROCKET_BURST_COUNT}`
    : (state.rocketCooldown || 0) > 0
      ? `Rocket burst cooldown ${Math.ceil(state.rocketCooldown)}s`
      : `Rocket bursts ${ammoCount("rocketburst")}`;
  const rocketLabel = state.shipType === "rocketeer" ? ` | ${rocketStatus}` : "";
  const statsText = `${Math.floor(state.gold)}g | ${t("armor")} ${Math.round(spec.armor * 100)}% | ${t("speed")} ${state.shipType === "whaler" && state.whalerNets ? 9 : spec.speed} | ${t("regen")} ${spec.regen} | ${t("hold")} ${cargoCount()}/${cargoCapacity()}${blubberLabel}${netLabel}${turtleLabel}${rocketLabel}${fireLabel}`;
  if (statsText !== hudStatsText) {
    hudStatsText = statsText;
    setTextIfChanged(ui.statsLine, statsText);
  }
  const entries = Object.entries(state.cargo).filter(([, count]) => count > 0);
  const cargoHtml = entries.length ? entries.map(([name, count]) => `<span>${goodName(name)} x${count}</span>`).join("") : `<span>${t("emptyHold")}</span>`;
  if (cargoHtml !== hudCargoHtml) {
    hudCargoHtml = cargoHtml;
    setHtmlIfChanged(ui.cargoList, cargoHtml);
  }
  const island = currentIsland();
  const landIsland = state.mode === "land"
    ? islands.find((item) => item.name === state.dockedAt) || island
    : island;
  const nearForgeWaterfall = hasCursedCompass()
    && (state.viewMode === "swim" || state.dockedAt === "Forge")
    && Math.hypot(character.position.x - FORGE_WATERFALL.x, character.position.z - FORGE_WATERFALL.z) < 24;
  const showPrompt = ui.shop.classList.contains("hidden") && (island || state.mode === "land" || nearForgeWaterfall);
  ui.dockPrompt.classList.toggle("hidden", !showPrompt);
  if (showPrompt) {
    const dockPromptHtml = state.docking
      ? t("dockingPrompt", { island: islandName(state.docking.island), seconds: Math.ceil(state.docking.remaining) })
      : state.dockedAt === "Forge" && nearForgeWaterfall
        ? "Press <b>T</b> to descend the waterfall"
      : state.dockedAt === "Forge"
        ? "Press <b>R</b> near the pedestal for the forge"
      : state.viewMode === "swim" && nearForgeWaterfall
        ? "Press <b>T</b> to swim up the Forge waterfall"
      : state.mode === "ship"
      ? t("pressDock", { island: islandName(island) })
      : t("pressSailShop");
    if (dockPromptHtml !== hudDockPromptHtml) {
      hudDockPromptHtml = dockPromptHtml;
      setHtmlIfChanged(ui.dockPrompt, dockPromptHtml);
    }
  } else {
    hudDockPromptHtml = "";
  }
  if (clock.elapsedTime >= nextHudPanelRefreshAt) {
    nextHudPanelRefreshAt = clock.elapsedTime + HUD_PANEL_REFRESH_INTERVAL;
    updateSpyPanel();
    updateAmmoHotbar();
    renderLeaderboard();
  }
}

function renderLeaderboard() {
  if (!ui.leaderboardList || ui.leaderboardPanel.classList.contains("hidden")) return;
  const rows = [
    { name: captainName(), gold: Math.floor(state.gold), infiniteGold: Boolean(state.infiniteGold), self: true },
    ...[...remotePlayers.values()].map((player) => ({
      name: player.name || t("captain"),
      gold: Math.floor(Number(player.gold) || 0),
      infiniteGold: Boolean(player.infiniteGold),
      self: false,
    })),
  ]
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 10);
  const signature = rows.map((row) => `${row.self ? 1 : 0}:${row.name}:${row.gold}:${row.infiniteGold ? 1 : 0}`).join("|");
  if (signature === leaderboardSignature) return;
  leaderboardSignature = signature;
  setHtmlIfChanged(ui.leaderboardList, rows.map((row) => (
    `<li${row.self ? ' class="self"' : ""}><span>${escapeMarkup(row.name)}</span><b>${row.infiniteGold ? "Infinite" : `${row.gold}g`}</b></li>`
  )).join(""));
}

function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function liveSpyTarget(snapshot) {
  if (!snapshot?.spyKind || !snapshot.spyId) return snapshot;
  let live = null;
  if (snapshot.spyKind === "bot") {
    live = bots.find((bot) => (bot.serverId || bot.localId || String(bot.group?.id)) === snapshot.spyId);
  } else if (snapshot.spyKind === "player") {
    live = remotePlayers.get(snapshot.spyId);
  }
  if (!live?.group) return null;
  const spec = getShipStats(live.shipType || snapshot.shipType);
  const hp = Number(live.hp);
  const max = snapshot.spyKind === "bot" ? Number(live.serverMaxHp) || spec.hp : spec.hp;
  const level = Number(live.level) || snapshot.level || 1;
  const pos = snapshot.spyKind === "player" ? live.lookPosition || live.group.position : live.group.position;
  const threat = level > state.level + 2 ? "Dangerous" : (Number.isFinite(hp) ? hp : spec.hp) < max * 0.4 ? "Wounded" : "Manageable";
  return {
    ...snapshot,
    name: snapshot.spyKind === "player" ? live.name || snapshot.name : shipName(live.shipType || snapshot.shipType),
    level,
    hp: Number.isFinite(hp) ? hp : spec.hp,
    max,
    armor: spec.armor,
    speed: spec.speed,
    regen: spec.regen,
    pos,
    shipPos: live.group.position,
    shipType: live.shipType || snapshot.shipType,
    group: live.group,
    crateEstimate: snapshot.spyKind === "bot" ? crateDropCount({ isBot: true, shipType: live.shipType || snapshot.shipType, level }) : snapshot.crateEstimate,
    threat,
  };
}

function updateSpyPanel() {
  const target = liveSpyTarget(state.spyTarget);
  if (!target || clock.elapsedTime > target.expires) {
    state.spyTarget = null;
    ui.spyPanel.classList.add("hidden");
    spyPanelSignature = "";
    return;
  }
  const distance = Math.round(dist2(playerShip.position, target.pos));
  const hpPct = Math.round((target.hp / target.max) * 100);
  ui.spyPanel.classList.remove("hidden");
  const spyName = target.kind === "Hostile" && target.shipType ? shipName(target.shipType) : target.name;
  const spyDetails = t("spyDetails", {
    level: target.level,
    distance: t("distanceMeter", { distance }),
    threat: t(String(target.threat || "").toLowerCase()) || target.threat,
    hp: Math.ceil(target.hp),
    max: target.max,
    pct: hpPct,
    armor: Math.round(target.armor * 100),
    speed: target.speed,
    regen: target.regen,
    crates: target.crateEstimate,
  });
  const signature = `${spyName}|${spyDetails}`;
  if (signature === spyPanelSignature) return;
  spyPanelSignature = signature;
  setTextIfChanged(ui.spyName, spyName);
  setHtmlIfChanged(ui.spyDetails, spyDetails);
}

function mapPoint(x, z) {
  const range = MINIMAP_VISIBLE_LIMIT;
  const size = ui.minimap.width;
  return {
    x: size * 0.5 + (x / range) * size * 0.5,
    y: size * 0.5 + (z / range) * size * 0.5,
  };
}

function worldPointFromMinimapEvent(event) {
  const rect = ui.minimap.getBoundingClientRect();
  const xRatio = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const yRatio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
  return new THREE.Vector3(
    (xRatio - 0.5) * MINIMAP_VISIBLE_LIMIT * 2,
    0,
    (yRatio - 0.5) * MINIMAP_VISIBLE_LIMIT * 2,
  );
}

function teleportGoldDiggerTo(point, source = "map") {
  if (!hasGoldDiggerPowers() || !playerShip) return false;
  const target = point.clone();
  target.x = clamp(target.x, -MINIMAP_VISIBLE_LIMIT, MINIMAP_VISIBLE_LIMIT);
  target.y = 0;
  target.z = clamp(target.z, -MINIMAP_VISIBLE_LIMIT, MINIMAP_VISIBLE_LIMIT);
  if (pointInAnyIsland(target, 3)) {
    toast("GoldDigger teleport blocked: island.");
    return true;
  }
  closeShop();
  state.mode = "ship";
  state.viewMode = "ship";
  state.dockedAt = null;
  state.docking = null;
  state.fallingOffWorld = false;
  state.fallingTimer = 0;
  state.fallVelocityY = 0;
  state.fallDrift.set(0, 0, 0);
  state.fallSpin.set(0, 0, 0);
  state.leviathanGrabbed = false;
  state.activeBalloonIndex = -1;
  state.velocity.set(0, 0, 0);
  playerShip.visible = true;
  playerShip.position.set(target.x, SHIP_WATERLINE_Y, target.z);
  playerShip.rotation.y = state.rotation;
  character.visible = false;
  state.position.copy(playerShip.position);
  multiplayer.lastSent = 0;
  toast(source === "minimap" ? "GoldDigger minimap teleport." : "GoldDigger teleport.");
  return true;
}

function handleGoldDiggerMinimapTeleport(event) {
  if (!hasGoldDiggerPowers() || nameGateOpen()) return false;
  event.preventDefault();
  event.stopPropagation();
  return teleportGoldDiggerTo(worldPointFromMinimapEvent(event), "minimap");
}

function drawMapDot(ctx, x, z, radius, color, stroke = null) {
  const { x: px, y: py } = mapPoint(x, z);
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  return { x: px, y: py };
}

function drawKrakenMapMarker(ctx, x, z, ratio, hp, maxHp) {
  const pos = mapPoint(x, z);
  const pulse = (Math.sin(clock.elapsedTime * 3.4) + 1) * 0.5;
  const radius = (5.8 + pulse * 0.9) * ratio;
  const hpRatio = clamp((Number(hp) || 0) / Math.max(1, Number(maxHp) || 10000), 0, 1);
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(184,39,36,0.94)";
  ctx.strokeStyle = "rgba(243,195,59,0.9)";
  ctx.lineWidth = 1.5 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,238,166,0.58)";
  ctx.lineWidth = 0.9 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 2.3 * ratio, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#f3c33b";
  ctx.lineWidth = 1.4 * ratio;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 6 + Math.sin(clock.elapsedTime * 1.2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(1.8 * ratio, -2.0 * ratio, 4.0 * ratio, -1.2 * ratio, 5.4 * ratio, -3.4 * ratio);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "#e95055";
  ctx.lineWidth = 1.7 * ratio;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4.0 * ratio, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
  ctx.stroke();

  ctx.restore();
  return pos;
}

function minimapStaticSignature(size, expanded) {
  const islandSignature = islands.filter((island) => !island.noMinimap).map((island) => `${island.name}:${islandName(island)}:${island.radius}`).join("|");
  return `${size}:${state.language}:${expanded ? 1 : 0}:${islandSignature}`;
}

function renderMinimapSeaLayer(ctx, size) {
  ctx.clearRect(0, 0, size, size);
  const sea = ctx.createLinearGradient(0, 0, size, size);
  sea.addColorStop(0, "#8de6ee");
  sea.addColorStop(1, "#279abd");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const p = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
}

function renderMinimapIslandLayer(ctx, size) {
  ctx.clearRect(0, 0, size, size);
  islands.forEach((island) => {
    if (island.noMinimap) return;
    const pos = drawMapDot(ctx, island.group.position.x, island.group.position.z, Math.max(3, island.radius * size / (MAP_LIMIT * 2.45)), "#72bf61", "#f3df9b");
    if (shouldShowIslandLabel(island)) {
      ctx.fillStyle = "#17313c";
      ctx.font = `700 ${Math.max(7, size * 0.024)}px sans-serif`;
      ctx.fillText(islandName(island), pos.x + 4, pos.y - 4);
    }
  });
}

function ensureMinimapStaticLayers(size, expanded) {
  const signature = minimapStaticSignature(size, expanded);
  if (signature === minimapLayerCache.signature) return;
  minimapLayerCache.signature = signature;
  for (const canvas of [minimapLayerCache.sea, minimapLayerCache.islands]) {
    if (canvas.width !== size) canvas.width = size;
    if (canvas.height !== size) canvas.height = size;
  }
  renderMinimapSeaLayer(minimapLayerCache.sea.getContext("2d"), size);
  renderMinimapIslandLayer(minimapLayerCache.islands.getContext("2d"), size);
}

function updateMinimap(force = false) {
  if (!minimapCtx || ui.minimapPanel.classList.contains("hidden")) return;
  if (!force && clock.elapsedTime < nextMinimapRenderAt) return;
  nextMinimapRenderAt = clock.elapsedTime + MINIMAP_RENDER_INTERVAL;
  const canvas = ui.minimap;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const cssSize = Math.max(120, Math.round(canvas.clientWidth || 180));
  const pixelSize = Math.round(cssSize * ratio);
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }
  const ctx = minimapCtx;
  const size = canvas.width;
  const expanded = ui.minimapPanel.classList.contains("expanded");
  ensureMinimapStaticLayers(size, expanded);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(minimapLayerCache.sea, 0, 0);
  storms.forEach((storm) => {
    const pos = mapPoint(storm.group.position.x, storm.group.position.z);
    const r = Math.max(8, storm.radius * size / (MINIMAP_VISIBLE_LIMIT * 2));
    const cloud = ctx.createRadialGradient(pos.x, pos.y, r * 0.15, pos.x, pos.y, r);
    cloud.addColorStop(0, "rgba(35,39,47,0.5)");
    cloud.addColorStop(1, "rgba(35,39,47,0.12)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(217,251,255,0.42)";
    ctx.lineWidth = 1.2 * ratio;
    ctx.beginPath();
    ctx.moveTo(pos.x - 2 * ratio, pos.y - 5 * ratio);
    ctx.lineTo(pos.x + 2 * ratio, pos.y - 1 * ratio);
    ctx.lineTo(pos.x - 1 * ratio, pos.y - 1 * ratio);
    ctx.lineTo(pos.x + 3 * ratio, pos.y + 5 * ratio);
    ctx.stroke();
  });
  ui.toggleWindMap?.classList.toggle("active", state.showWindMarkers);
  if (state.showWindMarkers) {
    windCurrents.forEach((wind) => {
      const pos = mapPoint(wind.x, wind.z);
      const len = 8 * ratio;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(Math.PI - wind.dir);
      ctx.strokeStyle = "rgba(255,253,242,0.72)";
      ctx.fillStyle = "rgba(255,253,242,0.72)";
      ctx.lineWidth = 1.2 * ratio;
      ctx.beginPath();
      ctx.moveTo(0, len * 0.65);
      ctx.lineTo(0, -len * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.85);
      ctx.lineTo(-3 * ratio, -len * 0.35);
      ctx.lineTo(3 * ratio, -len * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.drawImage(minimapLayerCache.islands, 0, 0);
  crates.forEach((crate) => drawMapDot(
    ctx,
    crate.mesh.position.x,
    crate.mesh.position.z,
    crate.kind === "kraken" ? 4.2 : crate.kind === "treasure" ? 3.6 : 2.2,
    crate.kind === "kraken" ? "#6b3d69" : crate.kind === "treasure" ? "#f3c33b" : "#b87533",
    "#fff0bc"
  ));
  if (krakenBoss?.group?.visible) {
    drawKrakenMapMarker(ctx, krakenBoss.group.position.x, krakenBoss.group.position.z, ratio, krakenBoss.hp, krakenBoss.maxHp);
  }
  animals.forEach((animal) => {
    if (animal.kind === "whale") drawMapDot(ctx, animal.group.position.x, animal.group.position.z, expanded ? 4.2 : 3.2, "#315f89", "#d9fbff");
  });
  bots.forEach((bot) => drawMapDot(ctx, bot.group.position.x, bot.group.position.z, expanded ? 4 : 3, "#cf493f", "#341918"));
  serverBotBalloons.forEach((balloon) => {
    if (balloon.group.visible || balloon.group.userData.renderCulled) drawMapDot(ctx, balloon.group.position.x, balloon.group.position.z, expanded ? 3.3 : 2.4, "#d36b3d", "#fff1a6");
  });
  remotePlayers.forEach((remote) => {
    if (remote.group.visible || remote.group.userData.renderCulled) drawMapDot(ctx, remote.group.position.x, remote.group.position.z, expanded ? 4 : 3, "#7e55c7", "#f7ecff");
    (remote.fleetShips || []).forEach((ship) => {
      if (ship.group.visible || ship.group.userData.renderCulled) drawMapDot(ctx, ship.group.position.x, ship.group.position.z, expanded ? 3.2 : 2.4, "#8f79d6", "#f7ecff");
    });
    (remote.balloons || []).forEach((balloon) => {
      if (balloon.group.visible || balloon.group.userData.renderCulled) drawMapDot(ctx, balloon.group.position.x, balloon.group.position.z, expanded ? 3.5 : 2.6, "#c565db", "#f7ecff");
    });
  });
  ownedShips.forEach((ship) => {
    drawMapDot(ctx, ship.group.position.x, ship.group.position.z, expanded ? 3.6 : 2.8, "#f3c33b", "#5b3b11");
  });
  balloons.forEach((balloon) => {
    if (balloon.destroyed) return;
    const pos = drawMapDot(ctx, balloon.group.position.x, balloon.group.position.z, expanded ? 4 : 3, "#d85842", "#fff1a6");
    ctx.fillStyle = "#fff1a6";
    ctx.fillRect(pos.x - 1.5 * ratio, pos.y + 3 * ratio, 3 * ratio, 2 * ratio);
  });
  const playerPos = state.viewMode === "deck" || state.viewMode === "swim" || state.mode === "land" ? character.position : playerShip.position;
  const playerMap = drawMapDot(ctx, playerPos.x, playerPos.z, expanded ? 5 : 4, "#fffdf2", "#123742");
  const rotation = state.viewMode === "deck" || state.viewMode === "swim" || state.mode === "land" ? character.rotation.y : state.rotation;
  ctx.save();
  ctx.translate(playerMap.x, playerMap.y);
  ctx.rotate(Math.PI - rotation);
  ctx.fillStyle = "#10313d";
  ctx.beginPath();
  ctx.moveTo(0, -8 * ratio);
  ctx.lineTo(5 * ratio, 6 * ratio);
  ctx.lineTo(-5 * ratio, 6 * ratio);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(16,32,42,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
}

function multiplayerMotionPayload() {
  return {
    poseTime: Date.now(),
    name: captainName(),
    autoName: Boolean(state.autoGeneratedName),
    level: state.level,
    gold: Math.floor(state.gold),
    infiniteGold: Boolean(state.infiniteGold),
    hp: state.hp,
    shipType: state.shipType,
    mode: state.mode,
    viewMode: state.viewMode,
    hasCursedCompass: hasCursedCompass(),
    dockedAt: state.dockedAt,
    whalerNets: Boolean(state.shipType === "whaler" && state.whalerNets),
    turtleFire: Boolean(turtleFireActiveForState()),
    x: playerShip.position.x,
    z: playerShip.position.z,
    vx: state.velocity.x,
    vz: state.velocity.z,
    rotation: playerShip.rotation.y,
    landX: character.position.x,
    landY: character.position.y,
    landZ: character.position.z,
    landRotation: character.rotation.y,
    charX: character.position.x,
    charY: character.position.y,
    charZ: character.position.z,
    charRotation: character.rotation.y,
  };
}

function multiplayerPayload() {
  return {
    ...multiplayerMotionPayload(),
    fleetShips: ownedShips.slice(0, 12).map((ship) => ({
      id: ship.id,
      type: ship.type,
      hp: ship.hp,
      dockedAt: ship.dockedAt,
      x: ship.group.position.x,
      z: ship.group.position.z,
      rotation: ship.group.rotation.y,
    })),
    balloons: balloons
      .filter((balloon) => !balloon.destroyed)
      .slice(0, 5)
      .map((balloon, index) => ({
        id: `${captainId}-balloon-${index}`,
        x: balloon.group.position.x,
        y: balloon.group.position.y,
        z: balloon.group.position.z,
        rotation: balloon.rotation,
        hp: balloon.hp,
        bomb: Boolean(balloon.bomb),
        landing: Boolean(balloon.landing),
      })),
  };
}

function realtimeSocketOpen() {
  return typeof WebSocket !== "undefined"
    && multiplayer.fastSocket?.readyState === WebSocket.OPEN
    && multiplayer.fastReady;
}

function multiplayerSocketOpen() {
  return (typeof WebSocket !== "undefined" && multiplayer.socket?.readyState === WebSocket.OPEN)
    || Boolean(multiplayer.channel);
}

function sendRealtimeMultiplayer(message, force = false) {
  if (typeof WebSocket !== "undefined" && multiplayer.fastSocket?.readyState === WebSocket.OPEN) {
    if (!force && Number(multiplayer.fastSocket.bufferedAmount || 0) > REALTIME_SOCKET_MAX_BUFFER) return false;
    multiplayer.fastSocket.send(JSON.stringify(message));
    return true;
  }
  if (multiplayer.channel) {
    multiplayer.channel.postMessage(message);
    return true;
  }
  return false;
}

function sendMultiplayer(message) {
  if (typeof WebSocket !== "undefined" && multiplayer.socket?.readyState === WebSocket.OPEN) {
    multiplayer.socket.send(JSON.stringify(message));
    return true;
  }
  if (multiplayer.channel) {
    multiplayer.channel.postMessage(message);
    return true;
  }
  return false;
}

function makeRemoteCharacter() {
  const group = new THREE.Group();
  const skin = mat(0xc88b58);
  const cloth = mat(0x28678c);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.3), cloth);
  body.position.y = 1.18;
  body.castShadow = true;
  group.add(body);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.14), mats.gold);
  sash.position.set(0, 1.24, 0.22);
  sash.castShadow = true;
  group.add(sash);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  group.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.34, 8), mat(0xd9a028));
  hat.position.y = 2.02;
  hat.castShadow = true;
  group.add(hat);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), cloth);
    arm.position.set(side * 0.37, 1.14, 0.01);
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), mat(0x27364a));
    leg.position.set(side * 0.14, 0.31, 0);
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.32), mat(0x241a16));
    foot.position.set(side * 0.14, 0.05, 0.06);
    group.add(foot);
  }
  group.scale.setScalar(CHARACTER_SCALE / 0.34);
  group.visible = false;
  return group;
}

function updateRemoteLabel(remote, name) {
  if (remote.name === name) return;
  scene.remove(remote.label);
  remote.label = makeLabel(name || "Captain");
  scene.add(remote.label);
  remote.name = name;
}

function removeRemotePlayer(id) {
  const remote = remotePlayers.get(id);
  if (!remote) return;
  clearBurnVisual(remote);
  scene.remove(remote.group, remote.avatar, remote.label);
  (remote.balloons || []).forEach((balloon) => scene.remove(balloon.group));
  (remote.fleetShips || []).forEach((ship) => scene.remove(ship.group));
  remotePlayers.delete(id);
}

function syncRemoteFleet(remote, dataFleet = []) {
  remote.fleetShips = remote.fleetShips || [];
  const wanted = Array.isArray(dataFleet) ? dataFleet.slice(0, 12) : [];
  const wantedIds = new Set(wanted.map((entry, index) => entry.id || `remote-fleet-${index}`));
  remote.fleetShips.slice().forEach((ship) => {
    if (wantedIds.has(ship.id)) return;
    scene.remove(ship.group);
    remote.fleetShips.splice(remote.fleetShips.indexOf(ship), 1);
  });
  wanted.forEach((entry, index) => {
    const id = entry.id || `remote-fleet-${index}`;
    const type = entry.type || "skiff";
    let ship = remote.fleetShips.find((item) => item.id === id);
    if (!ship) {
      ship = { id, type, group: makeShip(type, true) };
      scene.add(ship.group);
      remote.fleetShips.push(ship);
    } else if (ship.type !== type) {
      scene.remove(ship.group);
      ship.group = makeShip(type, true);
      scene.add(ship.group);
      ship.type = type;
    }
    ship.hp = Number(entry.hp) || getShipStats(type).hp;
    ship.dockedAt = entry.dockedAt || null;
    ship.group.position.set(Number(entry.x) || 0, SHIP_WATERLINE_Y, Number(entry.z) || 0);
    ship.group.rotation.y = Number(entry.rotation) || 0;
    ship.group.visible = true;
  });
}

function syncRemoteBalloons(remote, dataBalloons = []) {
  remote.balloons = remote.balloons || [];
  const wanted = Array.isArray(dataBalloons) ? dataBalloons.slice(0, 5) : [];
  while (remote.balloons.length > wanted.length) {
    const removed = remote.balloons.pop();
    scene.remove(removed.group);
  }
  wanted.forEach((entry, index) => {
    let balloon = remote.balloons[index];
    if (!balloon) {
      balloon = { group: makeBalloonMesh(false), bank: 0 };
      balloon.group.scale.setScalar(0.86);
      scene.add(balloon.group);
      remote.balloons[index] = balloon;
    }
    const previousRotation = balloon.group.rotation.y;
    balloon.group.position.set(Number(entry.x) || 0, Number(entry.y) || 24, Number(entry.z) || 0);
    balloon.group.rotation.y = Number(entry.rotation) || 0;
    const targetBank = clamp(-angleDelta(balloon.group.rotation.y, previousRotation) * 3.2, -0.16, 0.16);
    balloon.bank = (balloon.bank || 0) + (targetBank - (balloon.bank || 0)) * 0.28;
    balloon.group.rotation.z = balloon.bank || 0;
    balloon.group.visible = true;
  });
}

function upsertRemotePlayer(data) {
  if (!data || !data.id || data.id === playerId || data.id === multiplayer.networkId) return;
  const x = Number(data.x);
  const z = Number(data.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;

  const incomingPoseTime = Number(data.poseTime);
  const fallbackPoseTime = Number(data.updated);
  const poseTime = Number.isFinite(incomingPoseTime) && incomingPoseTime > 0
    ? incomingPoseTime
    : Number.isFinite(fallbackPoseTime) && fallbackPoseTime > 0
      ? fallbackPoseTime
      : 0;
  let remote = remotePlayers.get(data.id);
  const acceptPose = !remote || !poseTime || poseTime >= (Number(remote.lastPoseTime) || 0);
  const shipType = acceptPose ? (data.shipType || remote?.shipType || "skiff") : (remote.shipType || data.shipType || "skiff");
  if (!remote) {
    const group = makeShip(shipType, true);
    const avatar = makeRemoteCharacter();
    const label = makeLabel(data.name || "Captain");
    scene.add(group, avatar, label);
    remote = {
      group,
      avatar,
      label,
      updated: 0,
      name: data.name || "Captain",
      shipType,
      velocity: new THREE.Vector3(),
      bank: 0,
      fleetShips: [],
      serverPosition: new THREE.Vector3(),
      avatarTargetPosition: new THREE.Vector3(),
      lastPoseTime: poseTime || 0,
    };
    remotePlayers.set(data.id, remote);
  } else if (acceptPose && remote.shipType !== shipType) {
    const previousPosition = remote.group.position.clone();
    const previousRotation = remote.group.rotation.y;
    clearBurnVisual(remote);
    scene.remove(remote.group);
    remote.group = makeShip(shipType, true);
    remote.group.position.copy(previousPosition);
    remote.group.rotation.y = previousRotation;
    scene.add(remote.group);
    remote.shipType = shipType;
  }

  updateRemoteLabel(remote, data.name || "Captain");
  remote.updated = clock.elapsedTime;
  remote.level = data.level || 1;
  remote.gold = Number(data.gold) || 0;
  remote.infiniteGold = Boolean(data.infiniteGold);
  remote.hp = data.hp || getShipStats(shipType).hp;
  if (acceptPose) {
    if (poseTime) remote.lastPoseTime = poseTime;
    remote.mode = data.mode || "ship";
    remote.viewMode = data.viewMode || "ship";
    remote.whalerNets = Boolean(data.whalerNets);
    remote.turtleFire = Boolean(shipType === "turtle" && data.turtleFire && remote.mode === "ship");
    remote.velocity = remote.velocity || new THREE.Vector3();
    remote.velocity.set(Number(data.vx) || 0, 0, Number(data.vz) || 0);
    remote.serverPosition = remote.serverPosition || new THREE.Vector3();
    remote.serverPosition.set(x, SHIP_WATERLINE_Y, z);
    remote.serverRotation = Number(data.rotation) || 0;
    if (!remote.initialized) {
      remote.group.position.copy(remote.serverPosition);
      remote.group.rotation.y = remote.serverRotation;
      remote.initialized = true;
    }
  }
  remote.group.visible = true;

  if (!acceptPose) {
    if (Array.isArray(data.balloons)) syncRemoteBalloons(remote, data.balloons);
    if (Array.isArray(data.fleetShips)) syncRemoteFleet(remote, data.fleetShips);
    return;
  }

  const remoteView = remote.viewMode || "ship";
  const avatarVisible = data.mode === "land" || remoteView === "deck" || remoteView === "swim";
  remote.avatar.visible = avatarVisible;
  const charX = Number.isFinite(Number(data.charX)) ? Number(data.charX) : Number(data.landX);
  const charY = Number.isFinite(Number(data.charY)) ? Number(data.charY) : Number(data.landY);
  const charZ = Number.isFinite(Number(data.charZ)) ? Number(data.charZ) : Number(data.landZ);
  const charRotation = Number.isFinite(Number(data.charRotation)) ? Number(data.charRotation) : Number(data.landRotation);
  if (avatarVisible && Number.isFinite(charX) && Number.isFinite(charZ)) {
    const fallbackY = remoteView === "swim" ? 0.08 : data.mode === "land" ? 2.95 : SHIP_WATERLINE_Y + shipDeckLocalY(shipType);
    remote.avatarTargetPosition = remote.avatarTargetPosition || new THREE.Vector3();
    remote.avatarTargetPosition.set(charX, Number.isFinite(charY) ? charY : fallbackY, charZ);
    remote.avatarTargetRotation = charRotation || 0;
    if (!remote.avatarInitialized) {
      remote.avatar.position.copy(remote.avatarTargetPosition);
      remote.avatar.rotation.y = remote.avatarTargetRotation;
      remote.avatarInitialized = true;
    }
    remote.avatar.scale.setScalar((CHARACTER_SCALE / 0.34) * (remoteView === "swim" ? 0.78 : 1));
    remote.lookPosition = remote.avatar.position;
  } else {
    remote.avatarTargetPosition = null;
    remote.avatarInitialized = false;
    remote.avatar.scale.setScalar(CHARACTER_SCALE / 0.34);
    remote.lookPosition = remote.group.position;
  }
  if (Array.isArray(data.balloons)) syncRemoteBalloons(remote, data.balloons);
  if (Array.isArray(data.fleetShips)) syncRemoteFleet(remote, data.fleetShips);
}

function updateRemotePlayers(dt) {
  const positionAlpha = clamp(dt * REMOTE_POSITION_LERP, 0, 0.42);
  const rotationAlpha = clamp(dt * REMOTE_ROTATION_LERP, 0, 0.48);
  remotePlayers.forEach((remote) => {
    if (remote.serverPosition) {
      remote.group.position.lerp(remote.serverPosition, positionAlpha);
      remote.group.position.y = SHIP_WATERLINE_Y;
    }
    const previousRotation = remote.group.rotation.y;
    if (Number.isFinite(remote.serverRotation)) {
      remote.group.rotation.y = lerpAngle(remote.group.rotation.y, remote.serverRotation, rotationAlpha);
    }
    const speed = getShipStats(remote.shipType).speed || 15;
    const speedRatio = clamp((remote.velocity?.length?.() || 0) / Math.max(1, speed), 0, 1.15);
    const turnRate = angleDelta(remote.group.rotation.y, previousRotation) / Math.max(dt, 0.001);
    const targetBank = clamp(-turnRate * speedRatio * 0.035, -0.075, 0.075);
    remote.bank = (remote.bank || 0) + (targetBank - (remote.bank || 0)) * clamp(dt * 4.2, 0, 1);
    remote.group.rotation.z = remote.bank || 0;
    updateWhalerNetVisuals(remote.group, Boolean(remote.whalerNets), dt);
    if (remote.avatar.visible && remote.avatarTargetPosition) {
      remote.avatar.position.lerp(remote.avatarTargetPosition, positionAlpha);
      remote.avatar.rotation.y = lerpAngle(remote.avatar.rotation.y, remote.avatarTargetRotation || 0, rotationAlpha);
      remote.lookPosition = remote.avatar.position;
      remote.label.position.set(remote.avatar.position.x, 5.8, remote.avatar.position.z);
    } else {
      remote.lookPosition = remote.group.position;
      remote.label.position.set(remote.group.position.x, 7, remote.group.position.z);
    }
    remote.label.lookAt(camera.position);
  });
}

function removeBot(bot) {
  if (!bot) return;
  clearBurnVisual(bot);
  if (bot.serverId) serverBotMap.delete(bot.serverId);
  scene.remove(bot.group);
  const index = bots.indexOf(bot);
  if (index >= 0) bots.splice(index, 1);
}

function syncServerBombs(items = []) {
  const seen = new Set();
  items.forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    let bomb = balloonBombs.find((item) => item.serverId === data.id);
    if (!bomb) {
      const mesh = makeBalloonBombMesh();
      scene.add(mesh);
      bomb = { serverId: data.id, mesh };
      balloonBombs.push(bomb);
    }
    bomb.mesh.position.set(Number(data.x) || 0, Number(data.y) || 0, Number(data.z) || 0);
  });
  balloonBombs.slice().forEach((bomb) => {
    if (!bomb.serverId || seen.has(bomb.serverId)) return;
    scene.remove(bomb.mesh);
    balloonBombs.splice(balloonBombs.indexOf(bomb), 1);
  });
}

function removeServerBotBalloon(balloon, impact = false) {
  if (!balloon) return;
  if (impact) {
    const pos = balloon.group.position.clone().setY(0);
    makeSplashEffect(pos);
    makeSplinterEffect(pos.clone().setY(0.8), new THREE.Vector3(1, 0, 0));
  }
  scene.remove(balloon.group);
  const index = serverBotBalloons.indexOf(balloon);
  if (index >= 0) serverBotBalloons.splice(index, 1);
}

function syncServerBotBalloons(items = []) {
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    let balloon = serverBotBalloons.find((item) => item.serverId === data.id);
    if (!balloon) {
      const group = makeBalloonMesh(false);
      group.scale.setScalar(0.9);
      scene.add(group);
      balloon = { serverId: data.id, group };
      serverBotBalloons.push(balloon);
    }
    balloon.serverPosition = balloon.serverPosition || new THREE.Vector3();
    balloon.serverPosition.set(Number(data.x) || 0, Number(data.y) || 24, Number(data.z) || 0);
    balloon.serverRotation = Number(data.rotation) || 0;
    balloon.falling = Boolean(data.falling);
    balloon.hp = Number(data.hp) || 0;
    balloon.bomb = Boolean(data.bomb);
    balloon.fallSpin = balloon.fallSpin || new THREE.Vector3();
    balloon.fallSpin.set(Number(data.spinX) || 0.8, Number(data.spinY) || 0.4, Number(data.spinZ) || 1.0);
    if (!balloon.initialized) {
      balloon.group.position.copy(balloon.serverPosition);
      balloon.group.rotation.y = balloon.serverRotation;
      balloon.initialized = true;
    }
    balloon.group.visible = true;
  });
  serverBotBalloons.slice().forEach((balloon) => {
    if (!seen.has(balloon.serverId)) removeServerBotBalloon(balloon);
  });
}

function syncServerFish(items = []) {
  const seen = new Set();
  fish.slice().forEach((item) => {
    if (!item.userData.serverId) removeFishItem(item);
  });
  (Array.isArray(items) ? items : []).forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    let item = serverFishMap.get(data.id);
    if (!item) {
      item = data.kind === "squid" ? makeSquid(data) : makeFish(data);
      serverFishMap.set(data.id, item);
    }
    item.userData.kind = data.kind === "squid" ? "squid" : "fish";
    item.userData.serverId = data.id;
    serverFishMap.set(data.id, item);
    item.userData.serverPosition = item.userData.serverPosition || item.position.clone();
    item.userData.serverPosition.set(Number(data.x) || 0, item.userData.kind === "squid" ? 0.12 : 0.15, Number(data.z) || 0);
    item.userData.serverDirection = Number.isFinite(Number(data.direction)) ? Number(data.direction) : item.userData.direction || 0;
    item.userData.serverUpdatedAt = clock.elapsedTime;
    item.userData.visualTarget = item.userData.visualTarget || item.position.clone();
    item.userData.radius = item.userData.kind === "squid" ? 1.05 : 0.75;
  });
  fish.slice().forEach((item) => {
    if (item.userData.serverId && !seen.has(item.userData.serverId)) removeFishItem(item);
  });
}

function removeAnimal(animal) {
  if (!animal) return;
  if (animal.serverId) serverWhaleMap.delete(animal.serverId);
  scene.remove(animal.group);
  const index = animals.indexOf(animal);
  if (index >= 0) animals.splice(index, 1);
}

function syncServerWhales(items = []) {
  const seen = new Set();
  animals.slice().forEach((animal) => {
    if (animal.kind === "whale" && !animal.serverId) removeAnimal(animal);
  });
  (Array.isArray(items) ? items : []).forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    let animal = serverWhaleMap.get(data.id);
    if (!animal) {
      animal = makeWhale(data);
      serverWhaleMap.set(data.id, animal);
    }
    animal.hp = Number(data.hp) || animal.hp;
    animal.maxHp = Number(data.maxHp) || animal.maxHp || 1000;
    animal.serverPosition = animal.serverPosition || new THREE.Vector3();
    animal.serverPosition.set(Number(data.x) || 0, 0.05, Number(data.z) || WHALE_NORTH_CENTER_Z);
    animal.serverRotation = Number(data.rotation) || 0;
    animal.serverSubmerged = Boolean(data.submerged);
    animal.serverTrappedUntil = Number(data.trappedUntil) || 0;
    animal.submergedUntil = animal.serverSubmerged ? clock.elapsedTime + 0.5 : 0;
  });
  animals.slice().forEach((animal) => {
    if (animal.kind === "whale" && animal.serverId && !seen.has(animal.serverId)) removeAnimal(animal);
  });
}

function removeStorm(storm) {
  if (!storm) return;
  if (storm.serverId) serverStormMap.delete(storm.serverId);
  scene.remove(storm.group);
  const index = storms.indexOf(storm);
  if (index >= 0) storms.splice(index, 1);
}

function syncServerStorms(items = []) {
  const seen = new Set();
  storms.slice().forEach((storm) => {
    if (!storm.serverId) removeStorm(storm);
  });
  (Array.isArray(items) ? items : []).forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    let storm = serverStormMap.get(data.id);
    if (!storm) {
      const group = makeStormCloud();
      scene.add(group);
      storm = {
        serverId: data.id,
        group,
        radius: Number(data.radius) || 70,
        born: Number.isFinite(Number(data.born)) ? clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000) : clock.elapsedTime,
        life: (Number(data.life) || 600000) / 1000,
        strikeAt: Infinity,
      };
      storms.push(storm);
      serverStormMap.set(data.id, storm);
    }
    storm.radius = Number(data.radius) || storm.radius || 70;
    storm.serverPosition = storm.serverPosition || new THREE.Vector3();
    storm.serverPosition.set(Number(data.x) || 0, 48, Number(data.z) || 0);
    if (!storm.initialized) {
      storm.group.position.copy(storm.serverPosition);
      storm.initialized = true;
    }
    const shadow = storm.group.children.find((child) => child.userData.stormShadow);
    if (shadow) shadow.scale.setScalar(storm.radius);
  });
  storms.slice().forEach((storm) => {
    if (storm.serverId && !seen.has(storm.serverId)) removeStorm(storm);
  });
}

function syncServerWorld(world) {
  if (!world) return;
  multiplayer.serverWorld = true;
  const worldSentAt = Number(world.serverTime);
  const transientWorldStale = Number.isFinite(worldSentAt) && Date.now() - worldSentAt > TRANSIENT_EFFECT_REPLAY_MAX_AGE_MS;
  if (Number.isFinite(Number(world.dayCycleTime))) {
    environment.serverDayLength = Math.max(60, Number(world.dayLengthSeconds) || DAY_LENGTH_SECONDS);
    environment.serverNightLength = Math.max(60, Number(world.nightLengthSeconds) || NIGHT_LENGTH_SECONDS);
    environment.serverCycleTime = Number(world.dayCycleTime) % (environment.serverDayLength + environment.serverNightLength);
    environment.serverCycleUpdatedAt = clock.elapsedTime;
  }
  if (world.cursedCompassOwner !== undefined) {
    state.cursedCompassOwner = world.cursedCompassOwner || null;
    if (state.cursedCompassOwner && ![multiplayer.networkId, playerId, captainId].includes(state.cursedCompassOwner)) state.items.cursedCompass = false;
  }

  const seenBots = new Set();
  (world.bots || []).forEach((data) => {
    if (!data?.id) return;
    seenBots.add(data.id);
    let bot = serverBotMap.get(data.id);
    const serverRotation = Number(data.rotation) || 0;
    if (!bot) {
      const group = makeShip(data.shipType || "cog", true);
      scene.add(group);
      const serverPosition = new THREE.Vector3(Number(data.x) || 0, SHIP_WATERLINE_Y, Number(data.z) || 0);
      bot = {
        isBot: true,
        serverId: data.id,
        localId: data.id,
        group,
        velocity: new THREE.Vector3(),
        serverVelocity: new THREE.Vector3(),
        predictedPosition: new THREE.Vector3(),
        turn: 0,
        fireCooldown: 0,
        courageous: Boolean(data.courageous),
      };
      bot.group.position.copy(serverPosition);
      bot.group.rotation.y = serverRotation;
      bots.push(bot);
      serverBotMap.set(data.id, bot);
    } else if (bot.shipType !== data.shipType) {
      clearBurnVisual(bot);
      scene.remove(bot.group);
      bot.group = makeShip(data.shipType || "cog", true);
      bot.serverPosition = bot.serverPosition || new THREE.Vector3();
      bot.serverPosition.set(Number(data.x) || 0, SHIP_WATERLINE_Y, Number(data.z) || 0);
      bot.group.position.copy(bot.serverPosition);
      bot.group.rotation.y = serverRotation;
      scene.add(bot.group);
    }
    const spec = getShipStats(data.shipType);
    bot.shipType = data.shipType || "cog";
    bot.hp = Number(data.hp) || spec.hp;
    bot.level = Number(data.level) || 1;
    bot.courageous = Boolean(data.courageous);
    bot.netsExtended = Boolean(data.netsExtended);
    bot.turtleFire = Boolean(bot.shipType === "turtle" && data.turtleFire);
    bot.serverMaxHp = Number(data.maxHp) || spec.hp;
    bot.serverPosition = bot.serverPosition || new THREE.Vector3();
    bot.serverPosition.set(Number(data.x) || 0, SHIP_WATERLINE_Y, Number(data.z) || 0);
    bot.serverVelocity = bot.serverVelocity || new THREE.Vector3();
    bot.serverVelocity.set(Number(data.vx) || 0, 0, Number(data.vz) || 0);
    bot.serverUpdatedAt = clock.elapsedTime;
    bot.predictedPosition = bot.predictedPosition || new THREE.Vector3();
    bot.serverRotation = serverRotation;
    if (data.fire) {
      const fireDps = Number(data.fire.dps);
      bot.fire = {
        dps: Number.isFinite(fireDps) ? fireDps : 2,
        remaining: Number(data.fire.remaining) || 0,
        visualOnly: true,
        scorch: bot.fire?.scorch || null,
        smokeTimer: bot.fire?.smokeTimer || 0,
      };
      if (!bot.fire.scorch) addScorchMark(bot);
    } else if (bot.fire) {
      clearBurnVisual(bot);
      bot.fire = null;
    }
  });
  bots.slice().forEach((bot) => {
    if (!bot.serverId || !seenBots.has(bot.serverId)) removeBot(bot);
  });

  const seenCrates = new Set();
  (world.crates || []).forEach((data) => {
    if (!data?.id) return;
    seenCrates.add(data.id);
    let crate = serverCrateMap.get(data.id);
    const serverKind = data.kind === "treasure" ? "treasure" : data.kind === "kraken" ? "kraken" : data.kind === "whale" ? "whale" : "crate";
    if (!crate) {
      const kind = serverKind;
      crate = {
        serverId: data.id,
        mesh: makeCrateMesh(Number(data.x) || 0, Number(data.z) || 0, kind),
        kind,
        heal: Number(data.heal) || 10,
        xp: Number(data.xp) || 16,
        gold: Number(data.gold) || 14,
        blubber: Number(data.blubber) || 0,
        born: Number.isFinite(Number(data.born)) ? clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000) : clock.elapsedTime,
      };
      crates.push(crate);
      serverCrateMap.set(data.id, crate);
    }
    crate.kind = serverKind;
    if (Number.isFinite(Number(data.born))) crate.born = clock.elapsedTime - Math.max(0, (Date.now() - Number(data.born)) / 1000);
    crate.heal = Number(data.heal) || crate.heal;
    crate.xp = Number(data.xp) || crate.xp;
    crate.gold = Number(data.gold) || crate.gold;
    crate.blubber = Number(data.blubber) || crate.blubber || 0;
    crate.mesh.position.x = Number(data.x) || crate.mesh.position.x;
    crate.mesh.position.z = Number(data.z) || crate.mesh.position.z;
  });
  crates.slice().forEach((crate) => {
    if (!crate.serverId || !seenCrates.has(crate.serverId)) removeCrate(crate);
  });
  syncServerLeviathan(world.leviathan);
  syncKraken(world.kraken);
  syncServerBombs(transientWorldStale ? [] : (world.bombs || []));
  syncServerBotBalloons(world.botBalloons || []);
  if (Array.isArray(world.fish)) syncServerFish(world.fish);
  if (Array.isArray(world.whales)) syncServerWhales(world.whales);
  if (Array.isArray(world.storms)) syncServerStorms(world.storms);
  syncIslandClaims([]);
  syncBuildingPieces([]);
}

function applyFishReward(fishReward) {
  if (!fishReward) return;
  const item = fish.find((candidate) => candidate.userData.serverId === fishReward.id);
  if (item) removeFishItem(item);
  state.gold += Number(fishReward.gold) || 0;
  addXP(Number(fishReward.xp) || 0);
  const kind = fishReward.kind === "squid" ? "Squid" : "Fish";
  const source = fishReward.source || "Line";
  toast(source === "Line" ? `${kind} reeled in after a hard pull.` : `${kind} caught by ${source}.`);
}

function applyCrateReward(crate) {
  if (!crate) return;
  const local = crates.find((item) => item.serverId === crate.id);
  if (local) removeCrate(local);
  if (crate.kind === "whale") {
    const amount = Math.max(1, Math.floor(Number(crate.blubber) || 1));
    if (canAddBlubber(amount)) {
      state.cargo["Whale Blubber"] = blubberCount() + amount;
      playSound("pickup", playerShip.position);
      toast("Recovered whale blubber.");
    } else {
      toast(state.shipType === "whaler" ? "Your blubber hold is full." : "Your hold is full.");
    }
    return;
  }
  state.hp = clamp(state.hp + (Number(crate.heal) || 0), 0, maxHp());
  addXP(Number(crate.xp) || 0);
  state.gold += Number(crate.gold) || 0;
  playSound("pickup", playerShip.position);
  toast(`${crate.kind === "kraken" ? "Kraken tentacle" : crate.kind === "treasure" ? "Treasure" : "Crate"} recovered: repairs, gold, and XP.`);
}

function applyRemotePlayerSunk(message) {
  if (multiplayer.serverWorld) return;
  const x = Number(message.x);
  const z = Number(message.z);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const count = clamp(Math.floor(Number(message.count) || 1), 1, 15);
  const pos = new THREE.Vector3(x, 0, z);
  dropCrates(pos, count);
  dropBlubberBits(pos, message.blubber);
}

function spawnRemoteShot(data) {
  if (!data || data.owner === playerId || data.owner === multiplayer.networkId) return;
  const sentAt = Number(data.sentAt);
  if (Number.isFinite(sentAt) && Date.now() - sentAt > SHOT_REPLAY_MAX_AGE_MS) return;
  if (data.id) {
    if (seenRemoteShots.has(data.id)) return;
    seenRemoteShots.add(data.id);
    if (seenRemoteShots.size > 220) {
      const oldest = seenRemoteShots.values().next().value;
      seenRemoteShots.delete(oldest);
    }
  }
  const pos = new THREE.Vector3(Number(data.x), Number.isFinite(Number(data.y)) ? Number(data.y) : 0, Number(data.z));
  const dir = new THREE.Vector3(Number(data.dirX), 0, Number(data.dirZ));
  if (![pos.x, pos.z, dir.x, dir.z].every(Number.isFinite) || dir.lengthSq() < 0.01) return;
  const target = Number.isFinite(Number(data.targetX)) && Number.isFinite(Number(data.targetZ))
    ? new THREE.Vector3(Number(data.targetX), 0, Number(data.targetZ))
    : null;
  makeProjectile(data.owner || "remote", pos, dir.normalize(), Number(data.damage) || 20, Number(data.range) || 36, {
    target,
    targetKind: data.targetKind || "any",
    ammoType: data.ammoType || "basic",
    ballistic: Boolean(data.ballistic),
    startY: Number.isFinite(Number(data.startY)) ? Number(data.startY) : undefined,
    baseDamage: Number(data.baseDamage) || Number(data.damage) || 20,
    rangeDamage: Boolean(data.rangeDamage),
    gravity: Number.isFinite(Number(data.gravity)) ? Number(data.gravity) : undefined,
    verticalVelocity: Number.isFinite(Number(data.verticalVelocity)) ? Number(data.verticalVelocity) : undefined,
    initialTraveled: Number.isFinite(Number(data.initialTraveled ?? data.traveled)) ? Number(data.initialTraveled ?? data.traveled) : undefined,
    createdWallAt: Number.isFinite(sentAt) ? sentAt : undefined,
    remote: true,
    serverId: data.id || null,
    serverAuthoritative: Boolean(data.serverAuth),
  });
}

function syncServerProjectiles(list = []) {
  const seen = new Set();
  list.forEach((data) => {
    if (!data?.id) return;
    seen.add(data.id);
    const existing = projectiles.find((shot) => shot.serverId === data.id);
    if (existing) {
      existing.serverLastSeenAt = Date.now();
      return;
    }
    spawnRemoteShot({
      ...data,
      x: Number.isFinite(Number(data.startX)) ? Number(data.startX) : data.x,
      y: Number.isFinite(Number(data.startY)) ? Number(data.startY) : data.y,
      z: Number.isFinite(Number(data.startZ)) ? Number(data.startZ) : data.z,
      initialTraveled: Number(data.traveled) || 0,
      sentAt: Number(data.sentAt) || Number(data.born) || Date.now(),
      serverAuth: true,
    });
  });
}

function applyServerShipDamage(message) {
  const sentAt = Number(message.sentAt);
  if (Number.isFinite(sentAt) && Date.now() - sentAt > SHOT_REPLAY_MAX_AGE_MS) return;
  if (state.mode !== "ship") return;
  const hitPosition = new THREE.Vector3(
    Number.isFinite(Number(message.x)) ? Number(message.x) : playerShip.position.x,
    Number.isFinite(Number(message.y)) ? Number(message.y) : SHIP_WATERLINE_Y + 1,
    Number.isFinite(Number(message.z)) ? Number(message.z) : playerShip.position.z
  );
  const fire = message.fire && typeof message.fire === "object"
    ? {
        dps: Number(message.fire.dps) || 0,
        duration: Number(message.fire.duration ?? message.fire.remaining) || 0,
      }
    : null;
  damageTarget(state, Number(message.damage) || 0, {
    fire: fire && fire.dps > 0 && fire.duration > 0 ? fire : null,
    hitPosition,
  });
}

function applyServerProjectileImpact(message) {
  const sentAt = Number(message.sentAt);
  if (Number.isFinite(sentAt) && Date.now() - sentAt > SHOT_REPLAY_MAX_AGE_MS) return;
  if (message.id) {
    if (seenServerImpacts.has(message.id)) return;
    seenServerImpacts.add(message.id);
    if (seenServerImpacts.size > 260) {
      const oldest = seenServerImpacts.values().next().value;
      seenServerImpacts.delete(oldest);
    }
  }
  const shot = projectiles.find((item) => item.serverId && item.serverId === message.id);
  const impactPosition = new THREE.Vector3(
    Number.isFinite(Number(message.x)) ? Number(message.x) : shot?.mesh.position.x || 0,
    Number.isFinite(Number(message.y)) ? Number(message.y) : shot?.mesh.position.y || SHIP_WATERLINE_Y,
    Number.isFinite(Number(message.z)) ? Number(message.z) : shot?.mesh.position.z || 0
  );
  if (!shot) {
    if (message.targetKind === "kraken") return;
    if (message.impact === "hit") {
      const dir = new THREE.Vector3(1, 0, 0);
      if (message.ammoType === "hotshot" || message.ammoType === "rocketburst") makeFireImpactEffect(impactPosition, dir);
      else makeSplinterEffect(impactPosition, dir);
    } else if (message.impact === "airburst") {
      makeAirburstExplosionVisual(impactPosition.setY(24));
    } else if (message.impact === "splash") {
      makeSplashEffect(impactPosition.setY(0));
    }
    return;
  }
  shot.mesh.position.copy(impactPosition);
  shot.target.copy(impactPosition).setY(0);
  if (message.impact === "airburst") {
    makeAirburstExplosionVisual(impactPosition.clone().setY(24));
    removeProjectile(shot);
  } else {
    removeProjectile(shot, message.impact === "hit" ? "hit" : message.impact === "splash" ? "splash" : "none");
  }
}

function handleMultiplayerMessage(message) {
  if (!message) return;
  if (message.type === "welcome") {
    multiplayer.networkId = message.id;
  } else if (message.type === "fastWelcome") {
    multiplayer.fastReady = true;
  } else if (message.type === "nameAssigned") {
    const assigned = String(message.name || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (assigned) {
      state.name = assigned;
      state.autoGeneratedName = Boolean(message.autoName);
      if (ui.nameInput) ui.nameInput.value = assigned;
      updateHud();
    }
  } else if (message.type === "accountLoaded") {
    state.accountAuthed = true;
    state.accountMode = "signin";
    if (message.progress) {
      applyAccountProgress(message.progress);
      toast(`Account loaded: ${message.account || state.accountName}.`);
    } else {
      setAccountMode("signin", `Signed in as ${message.account || state.accountName}. Progress will save.`);
      toast(`Account ready: ${message.account || state.accountName}.`);
    }
  } else if (message.type === "accountSaved") {
    state.accountAuthed = true;
  } else if (message.type === "accountError") {
    state.accountAuthed = false;
    const reason = message.reason || "Account could not be loaded.";
    setAccountMode(state.accountMode, reason);
    if (ui.nameGate && state.accountName) {
      ui.nameGate.classList.remove("hidden");
      setMenuScreen(true);
      if (state.googleAccount?.credential) {
        ui.accountStatus?.focus?.();
      } else {
        ui.accountPasswordInput?.focus();
        ui.accountPasswordInput?.select?.();
      }
    }
    toast(reason);
  } else if (message.type === "state") {
    upsertRemotePlayer(message.player);
  } else if (message.type === "motion") {
    upsertRemotePlayer(message.player);
  } else if (message.type === "leave") {
    removeRemotePlayer(message.id);
  } else if (message.type === "shot") {
    spawnRemoteShot(message.shot);
  } else if (message.type === "shots") {
    (Array.isArray(message.shots) ? message.shots : []).forEach(spawnRemoteShot);
  } else if (message.type === "world") {
    syncServerWorld(message);
  } else if (message.type === "crateReward") {
    applyCrateReward(message.crate);
  } else if (message.type === "itemInventory") {
    if (message.items && typeof message.items === "object") {
      state.items.cursedCompass = Boolean(message.items.cursedCompass);
    }
    if (message.owner !== undefined) state.cursedCompassOwner = message.owner || null;
    if (!state.infiniteGold && Number.isFinite(Number(message.gold))) state.gold = Math.max(0, Number(message.gold));
    if (hasCursedCompass()) {
      playSound("compass");
      toast("The Cursed Compass points beyond the map.");
    }
    renderInventory();
    if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
    updateHud();
  } else if (message.type === "itemError") {
    toast(message.reason || "That item is unavailable.");
    if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
  } else if (message.type === "cursedCompassOwner") {
    state.cursedCompassOwner = message.owner || null;
    if (!state.cursedCompassOwner && multiplayer.serverWorld) state.items.cursedCompass = false;
    if (state.cursedCompassOwner && ![multiplayer.networkId, playerId, captainId].includes(state.cursedCompassOwner)) state.items.cursedCompass = false;
    renderInventory();
    if (ui.shop && !ui.shop.classList.contains("hidden")) renderShop();
  } else if (message.type === "crateRemove") {
    removeCrate(crates.find((crate) => crate.serverId === message.id));
  } else if (message.type === "fishReward") {
    applyFishReward(message.fish);
  } else if (message.type === "fishRemove") {
    removeFishItem(fish.find((item) => item.userData.serverId === message.id));
  } else if (message.type === "bombHit") {
    const sentAt = Number(message.sentAt);
    if (Number.isFinite(sentAt) && Date.now() - sentAt > BOMB_EXPLOSION_REPLAY_MAX_AGE_MS) return;
    if (state.mode === "ship") damageTarget(state, Number(message.damage) || BALLOON_BOMB_DAMAGE, { ignoreArmor: true });
  } else if (message.type === "turtleFireHit") {
    const sentAt = Number(message.sentAt);
    if (Number.isFinite(sentAt) && Date.now() - sentAt > TRANSIENT_EFFECT_REPLAY_MAX_AGE_MS) return;
    if (state.mode === "ship") {
      damageTarget(state, Number(message.damage) || TURTLE_FIRE_DPS * 0.1, {
        ignoreArmor: true,
        fire: TURTLE_FIRE_SMOKE,
        hitPosition: playerShip.position.clone(),
      });
    }
  } else if (message.type === "whaleRam") {
    if (state.mode === "ship") {
      const origin = new THREE.Vector3(Number(message.x) || playerShip.position.x, 0, Number(message.z) || playerShip.position.z);
      const away = playerShip.position.clone().sub(origin);
      away.y = 0;
      if (away.lengthSq() < 0.01) away.set(Math.sin(state.rotation), 0, Math.cos(state.rotation));
      away.normalize();
      damageTarget(state, Number(message.damage) || 50);
      state.velocity.add(away.multiplyScalar(10));
      toast("A whale rammed your ship.");
    }
  } else if (message.type === "stormHit") {
    if (state.mode === "ship") damageTarget(state, Number(message.damage) || 50, { fire: message.fire || { dps: 10, duration: 3 }, hitPosition: playerShip.position.clone() });
  } else if (message.type === "balloonLightning") {
    const hit = balloons.find((balloon) => !balloon.destroyed && dist2(balloon.group.position, new THREE.Vector3(Number(message.x) || 0, 0, Number(message.z) || 0)) < 5);
    if (hit) destroyBalloon(hit, "lightning");
  } else if (message.type === "lightningStrike") {
    showServerLightning(message.x, message.z);
  } else if (message.type === "bombExplode") {
    const sentAt = Number(message.sentAt);
    const stale = Number.isFinite(sentAt) && Date.now() - sentAt > BOMB_EXPLOSION_REPLAY_MAX_AGE_MS;
    const bomb = balloonBombs.find((item) => item.serverId === message.id);
    if (bomb) {
      scene.remove(bomb.mesh);
      balloonBombs.splice(balloonBombs.indexOf(bomb), 1);
    }
    if (stale) return;
    const x = Number(message.x);
    const z = Number(message.z);
    if (Number.isFinite(x) && Number.isFinite(z)) detonateBalloonBomb(new THREE.Vector3(x, 0, z), { visualOnly: true, affectAnimals: true });
  } else if (message.type === "botBalloonCrash") {
    const balloon = serverBotBalloons.find((item) => item.serverId === message.id);
    if (balloon) removeServerBotBalloon(balloon, true);
    else if (Number.isFinite(Number(message.x)) && Number.isFinite(Number(message.z))) {
      const pos = new THREE.Vector3(Number(message.x), 0, Number(message.z));
      makeSplashEffect(pos);
      makeSplinterEffect(pos.clone().setY(0.8), new THREE.Vector3(1, 0, 0));
    }
  } else if (message.type === "playerSunk") {
    applyRemotePlayerSunk(message);
  } else if (message.type === "krakenAttack") {
    applyKrakenAttack({ ...(message.attack || {}), sentAt: Number(message.attack?.sentAt) || Number(message.sentAt) || undefined });
  } else if (message.type === "leviathanStrike") {
    applyServerLeviathanStrike(message);
  } else if (message.type === "leviathanDamage") {
    applyServerLeviathanDamage(message);
  } else if (message.type === "krakenDefeated") {
    // The dropped tentacle reward is visible in-world; no popup needed.
  } else if (message.type === "botReward") {
    state.gold += Number(message.gold) || 0;
    addXP(Number(message.xp) || 0);
    toast(`Sank a level ${message.level || 1} ship. Crates overboard!`);
  } else if (
    message.type === "buildInventory"
    || message.type === "buildError"
    || message.type === "islandClaimed"
    || message.type === "claimIsland"
    || message.type === "buildingPlaced"
    || message.type === "placeBuilding"
    || message.type === "buildingRemoved"
  ) {
    syncIslandClaims([]);
    syncBuildingPieces([]);
  } else if (message.x !== undefined) {
    upsertRemotePlayer(message);
  }
}

function startLocalMultiplayer(message) {
  if (multiplayer.channel || typeof BroadcastChannel === "undefined") return;
  try {
    multiplayer.channel = new BroadcastChannel("islandwake");
    multiplayer.mode = "local";
    multiplayer.serverWorld = false;
    multiplayer.channel.onmessage = (event) => handleMultiplayerMessage(event.data);
    if (message) toast(message);
  } catch {
    multiplayer.channel = null;
  }
}

function scheduleMultiplayerReconnect() {
  if (multiplayer.reconnectTimer || !location.protocol.startsWith("http")) return;
  multiplayer.mode = "reconnecting";
  const delay = clamp(1 + multiplayer.reconnectAttempts * 0.75, 1, 6);
  multiplayer.reconnectAttempts += 1;
  multiplayer.reconnectTimer = setTimeout(() => {
    multiplayer.reconnectTimer = null;
    setupMultiplayer(true);
  }, delay * 1000);
}

function scheduleRealtimeReconnect() {
  if (multiplayer.fastReconnectTimer || !multiplayer.socket || multiplayer.socket.readyState !== WebSocket.OPEN) return;
  multiplayer.fastReconnectTimer = setTimeout(() => {
    multiplayer.fastReconnectTimer = null;
    setupRealtimeMultiplayer();
  }, 900);
}

function closeRealtimeSocket() {
  const socket = multiplayer.fastSocket;
  multiplayer.fastSocket = null;
  multiplayer.fastReady = false;
  if (multiplayer.fastReconnectTimer) {
    clearTimeout(multiplayer.fastReconnectTimer);
    multiplayer.fastReconnectTimer = null;
  }
  if (socket && typeof WebSocket !== "undefined" && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) {
    try {
      socket.close();
    } catch {
      // Ignore close races while changing multiplayer lanes.
    }
  }
}

function setupRealtimeMultiplayer() {
  const canUseSocket = typeof WebSocket !== "undefined" && location.protocol.startsWith("http");
  if (!canUseSocket || !multiplayer.networkId || !multiplayer.socket || multiplayer.socket.readyState !== WebSocket.OPEN) return;
  if (multiplayer.fastSocket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(multiplayer.fastSocket.readyState)) return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}/?lane=fast&client=${encodeURIComponent(multiplayer.networkId)}`);
  multiplayer.fastSocket = socket;
  multiplayer.fastReady = false;
  socket.addEventListener("open", () => {
    if (multiplayer.fastSocket === socket) socket.send(JSON.stringify({ type: "fastHello", id: multiplayer.networkId }));
  });
  socket.addEventListener("message", (event) => {
    try {
      handleMultiplayerMessage(JSON.parse(event.data));
    } catch {
      // Ignore malformed real-time packets.
    }
  });
  socket.addEventListener("close", () => {
    if (multiplayer.fastSocket !== socket) return;
    multiplayer.fastSocket = null;
    multiplayer.fastReady = false;
    scheduleRealtimeReconnect();
  });
  socket.addEventListener("error", () => {
    if (multiplayer.fastSocket !== socket) return;
    multiplayer.fastSocket = null;
    multiplayer.fastReady = false;
    scheduleRealtimeReconnect();
  });
}

function setupMultiplayer(reconnecting = false) {
  const canUseSocket = typeof WebSocket !== "undefined" && location.protocol.startsWith("http");
  if (!canUseSocket) {
    startLocalMultiplayer("Local tab multiplayer is active.");
    return;
  }
  if (multiplayer.socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(multiplayer.socket.readyState)) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}`);
  multiplayer.socket = socket;
  let opened = false;

  socket.addEventListener("open", () => {
    opened = true;
    multiplayer.hasConnected = true;
    multiplayer.reconnectAttempts = 0;
    multiplayer.mode = "online";
    if (multiplayer.channel) {
      multiplayer.channel.close();
      multiplayer.channel = null;
    }
    if (state.joined) {
      const hello = { type: "hello", player: multiplayerPayload(), account: accountPayload() };
      const progress = accountProgressSnapshot({ accountSave: true });
      if (progress) hello.progress = progress;
      sendMultiplayer(hello);
    }
    toast(reconnecting ? "Reconnected to multiplayer waters." : "Connected to multiplayer waters.");
  });

  socket.addEventListener("message", (event) => {
    try {
      handleMultiplayerMessage(JSON.parse(event.data));
    } catch {
      // Ignore malformed network packets.
    }
  });

  socket.addEventListener("error", () => {
    if (!opened && !multiplayer.hasConnected) startLocalMultiplayer("Multiplayer server unavailable. Local tab multiplayer is active.");
  });

  socket.addEventListener("close", () => {
    if (multiplayer.socket === socket) multiplayer.socket = null;
    closeRealtimeSocket();
    if (opened || multiplayer.hasConnected) {
      if (multiplayer.mode !== "reconnecting") toast("Multiplayer disconnected. Reconnecting...");
      scheduleMultiplayerReconnect();
    } else {
      startLocalMultiplayer("Multiplayer server unavailable. Local tab multiplayer is active.");
    }
  });
}

addEventListener("beforeunload", () => {
  closeRealtimeSocket();
  if (multiplayer.channel) multiplayer.channel.postMessage({ type: "leave", id: playerId });
});

function flushPendingShotBatch() {
  shotBatchQueued = false;
  if (!pendingShotBatch.length) return;
  const shots = pendingShotBatch.splice(0);
  const message = shots.length === 1 ? { type: "shot", shot: shots[0] } : { type: "shots", shots };
  if (!sendRealtimeMultiplayer(message, true)) sendMultiplayer(message);
}

function queueShotPayload(shot) {
  pendingShotBatch.push(shot);
  if (shotBatchQueued) return;
  shotBatchQueued = true;
  if (typeof queueMicrotask === "function") queueMicrotask(flushPendingShotBatch);
  else Promise.resolve().then(flushPendingShotBatch);
}

function publishShot(origin, dir, damage, range, target = null, ammoType = "basic", options = {}) {
  const id = options.id || crypto.randomUUID();
  queueShotPayload({
    id,
    owner: playerId,
    sentAt: Date.now(),
    x: origin.x,
    y: origin.y,
    z: origin.z,
    dirX: dir.x,
    dirZ: dir.z,
    targetX: target?.x,
    targetZ: target?.z,
    damage,
    baseDamage: Number(options.baseDamage) || damage,
    range,
    targetKind: options.targetKind || "any",
    ammoType,
    ballistic: Boolean(options.ballistic),
    startY: Number(options.startY) || origin.y,
    rangeDamage: Boolean(options.rangeDamage),
    gravity: Number.isFinite(Number(options.gravity)) ? Number(options.gravity) : undefined,
    verticalVelocity: Number.isFinite(Number(options.verticalVelocity)) ? Number(options.verticalVelocity) : undefined,
  });
  return id;
}

function publishMultiplayer() {
  if (!state.joined) return;
  if (multiplayerSocketOpen() && clock.elapsedTime - multiplayer.motionLastSent >= MULTIPLAYER_MOTION_INTERVAL) {
    multiplayer.motionLastSent = clock.elapsedTime;
    const motionMessage = {
      type: "motion",
      player: { ...multiplayerMotionPayload(), id: playerId },
    };
    if (!sendRealtimeMultiplayer(motionMessage)) sendMultiplayer(motionMessage);
  }
  if (clock.elapsedTime - multiplayer.lastSent >= MULTIPLAYER_STATE_INTERVAL) {
    multiplayer.lastSent = clock.elapsedTime;
    const player = multiplayerPayload();
    const message = {
      type: "state",
      player: { ...player, id: playerId },
    };
    if (accountPayload() && clock.elapsedTime >= nextAccountProgressAt) {
      nextAccountProgressAt = clock.elapsedTime + ACCOUNT_PROGRESS_INTERVAL;
      const progress = accountProgressSnapshot({ accountSave: true });
      if (progress) message.progress = progress;
    }
    sendMultiplayer(message);
  }
  remotePlayers.forEach((remote, id) => {
    if (clock.elapsedTime - remote.updated > 5) {
      removeRemotePlayer(id);
    }
  });
}

function animateSea() {
  const t = clock.elapsedTime;
  seaDriftObjects.forEach((obj) => {
    obj.position.x += Math.sin(t + obj.userData.drift) * 0.004;
    obj.position.z += 0.014;
    if (obj.position.z > SEA_SIZE * 0.5) obj.position.z = -SEA_SIZE * 0.5;
  });
  cloudObjects.forEach((obj) => {
    obj.position.x += obj.userData.cloud * 0.006;
    if (obj.position.x > SEA_SIZE * 0.38) obj.position.x = -SEA_SIZE * 0.38;
  });
  waterfallObjects.forEach((obj) => {
    obj.material.opacity = 0.34 + Math.sin(t * 2.6 + obj.position.x * 0.01 + obj.position.z * 0.01) * 0.08;
  });
  waterfallFoamObjects.forEach((obj) => {
    obj.scale.z = 1 + Math.sin(t * 3.2 + obj.position.x * 0.01) * 0.08;
  });
  waterfallMistObjects.forEach((obj) => {
    obj.position.y -= 0.025;
    obj.material.opacity = 0.1 + Math.sin(t + obj.userData.waterfallMist) * 0.05;
    if (obj.position.y < -44) obj.position.y = -6;
  });
  const showForgeWaterfall = hasCursedCompass();
  hiddenForgeWaterfallObjects.forEach((group) => {
    group.visible = showForgeWaterfall;
    if (!showForgeWaterfall) return;
    const fallTopY = group.userData.forgeFallTopY || FORGE_ELEVATION + 3;
    const fallHeight = group.userData.forgeFallHeight || FORGE_ELEVATION + 3;
    group.children.forEach((child) => {
      if (child.userData.forgeMist) {
        child.position.y -= 0.018;
        child.material.opacity = 0.13 + Math.sin(t + child.userData.forgeMist) * 0.05;
        if (child.position.y < 1.5) child.position.y = fallTopY - 0.8;
      } else if (child.userData.forgeRibbon) {
        child.position.y = child.userData.baseY;
        child.position.x = child.userData.baseX + Math.sin(t * 1.8 + child.userData.forgeRibbon) * 0.18;
        child.material.opacity = 0.24 + Math.sin(t * 4 + child.userData.forgeRibbon) * 0.1;
      } else if (child.geometry?.type === "RingGeometry") {
        const scale = 1 + Math.sin(t * 2.8) * 0.08;
        child.scale.set(scale, scale, scale);
      }
    });
  });
  forgeAnimatedObjects.forEach((obj) => {
    if (obj.userData.forgeCrystalBase !== undefined) {
      obj.position.y = obj.userData.forgeCrystalBase + Math.sin(t * 1.6 + obj.userData.forgeCrystalPhase) * 0.22;
      obj.rotation.y += 0.012;
      obj.rotation.x = Math.sin(t * 0.9) * 0.08;
      return;
    }
    if (obj.userData.forgeParticle) {
      const p = (obj.userData.phase + t * 0.22) % 1;
      const angle = p * Math.PI * 2.6 + obj.userData.phase * 8.0;
      const radius = obj.userData.radius * (1 - p * 0.45);
      obj.position.x = Math.cos(angle) * radius;
      obj.position.z = obj.userData.centerZ + Math.sin(angle) * radius;
      obj.position.y = obj.userData.topY - p * obj.userData.drop + Math.sin(t * 4 + obj.userData.phase * 7) * 0.035;
      obj.rotation.y += 0.06;
      obj.rotation.x += 0.04;
      obj.scale.setScalar(0.65 + (1 - p) * 0.55);
    }
  });
}

function frame() {
  clearAllShipVisualRock();
  const dt = Math.min(0.033, clock.getDelta());
  syncActionCooldowns();
  if (state.joined) {
    updateTurtleFireTimers(dt);
    updateRocketeerBurst(dt);
    if (state.mode !== "ship" && state.turtleFire) {
      state.turtleFire = false;
      state.turtleFireTimer = 0;
      state.turtleFireUntil = 0;
      updateTurtleFireVisual(playerShip, false, dt);
    }
    if (state.mode === "ship") updateShip(dt);
    else updateWalker(dt);
    updateBots(dt);
    remotePlayers.forEach((remote) => updateFireDamage(remote, dt, remote.velocity?.length?.() || 0));
    updateRemotePlayers(dt);
    updateRemoteTurtleFires(dt);
    resolveShipContacts();
    updateProjectiles(dt);
    updateImpactEffects(dt);
    updateWaveHazards(dt);
    updateFish(dt);
    updateAnimals(dt);
    updateBalloons(dt);
    updateBalloonReticle();
    updateStorms(dt);
    updateLeviathan(dt);
    updateKraken(dt);
  }
  updateCamera(dt);
  updateDayNightCycle();
  animateSea();
  publishMultiplayer();
  if (clock.elapsedTime >= nextHudUpdateAt) {
    nextHudUpdateAt = clock.elapsedTime + HUD_UPDATE_INTERVAL;
    updateHud();
  }
  updateCursedCompassTrail();
  updateMinimap();
  updateRenderDistanceCulling();
  applyAllShipVisualRock();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initWorld();
refreshLanguageUI();
setupNameGate();
setupMultiplayer();
setupTransientResumeCleanup();
updateHud();
frame();
