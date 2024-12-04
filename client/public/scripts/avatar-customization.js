const avatarImg = document.getElementById("avatar");

// Default avatar config
const avatarConfig = {
  topType: "ShortHairShortCurly",
  eyeType: "Happy",
  clothesType: "Hoodie",
};

// Options for customization
const topTypes = [
    "NoHair",
    "ShortHairShortCurly",
    "ShortHairDreads01",
    "ShortHairDreads02",
    "ShortHairFrizzle",
    "LongHairStraight",
    "Hat",
    "Hijab",
    "WinterHat1",
    "WinterHat2",
    "Turban",
];
const eyeTypes = ["Happy", "Wink", "Surprised", "Close", "Cry", "Squint", "Dizzy"];

const clothesTypes = [
    "BlazerShirt",
    "BlazerSweater",
    "Hoodie",
    "ShirtCrewNeck",
    "ShirtVNeck",
    "GraphicShirt",
    "CollarSweater",
  ];

let currentTopIndex = topTypes.indexOf(avatarConfig.topType);
let currentEyeIndex = eyeTypes.indexOf(avatarConfig.eyeType);
let currentClothesIndex = clothesTypes.indexOf(avatarConfig.clothesType);

// Function to update avatar URL
function updateAvatar() {
    const avatarURL = `https://avataaars.io/?avatarStyle=Circle&topType=${avatarConfig.topType}&eyeType=${avatarConfig.eyeType}&clotheType=${avatarConfig.clothesType}`;
    avatarImg.src = avatarURL;
  }

// Event listeners for arrows
document.getElementById("left-top").addEventListener("click", () => {
  currentTopIndex =
    (currentTopIndex - 1 + topTypes.length) % topTypes.length;
  avatarConfig.topType = topTypes[currentTopIndex];
  updateAvatar();
});

document.getElementById("right-top").addEventListener("click", () => {
  currentTopIndex = (currentTopIndex + 1) % topTypes.length;
  avatarConfig.topType = topTypes[currentTopIndex];
  updateAvatar();
});

document.getElementById("left-eyes").addEventListener("click", () => {
  currentEyeIndex =
    (currentEyeIndex - 1 + eyeTypes.length) % eyeTypes.length;
  avatarConfig.eyeType = eyeTypes[currentEyeIndex];
  updateAvatar();
});

document.getElementById("right-eyes").addEventListener("click", () => {
  currentEyeIndex = (currentEyeIndex + 1) % eyeTypes.length;
  avatarConfig.eyeType = eyeTypes[currentEyeIndex];
  updateAvatar();
});

// Event listeners for "Clothes" customization
document.getElementById("left-clothes").addEventListener("click", () => {
    currentClothesIndex =
      (currentClothesIndex - 1 + clothesTypes.length) % clothesTypes.length;
    avatarConfig.clothesType = clothesTypes[currentClothesIndex];
    updateAvatar();
  });
  
  document.getElementById("right-clothes").addEventListener("click", () => {
    currentClothesIndex =
      (currentClothesIndex + 1) % clothesTypes.length;
    avatarConfig.clothesType = clothesTypes[currentClothesIndex];
    updateAvatar();
  });



// Initial render
updateAvatar();
