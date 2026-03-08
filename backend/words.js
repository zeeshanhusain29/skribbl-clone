const WORDS = {
  animals: [
    "cat", "dog", "elephant", "giraffe", "penguin", "dolphin", "tiger", "zebra",
    "kangaroo", "panda", "octopus", "butterfly", "parrot", "crocodile", "hamster",
    "cheetah", "gorilla", "flamingo", "hedgehog", "koala", "lobster", "peacock",
    "raccoon", "seahorse", "toucan", "walrus", "wolverine", "bison", "chameleon"
  ],
  objects: [
    "umbrella", "bicycle", "guitar", "telescope", "compass", "lantern", "anchor",
    "trophy", "scissors", "telescope", "magnifying glass", "backpack", "camera",
    "clock", "hammer", "ladder", "mirror", "notebook", "paintbrush", "rocket",
    "suitcase", "toothbrush", "violin", "watering can", "balloon", "candle",
    "crown", "diamond", "envelope", "flashlight", "globe", "hourglass", "key"
  ],
  food: [
    "pizza", "sushi", "hamburger", "ice cream", "taco", "burrito", "donut",
    "watermelon", "strawberry", "pineapple", "sandwich", "noodles", "cupcake",
    "popcorn", "pretzel", "waffle", "pancake", "spaghetti", "broccoli", "carrot",
    "avocado", "banana", "cherry", "grape", "lemon", "mango", "orange", "peach"
  ],
  actions: [
    "swimming", "dancing", "singing", "reading", "cooking", "painting", "running",
    "sleeping", "laughing", "crying", "climbing", "jumping", "flying", "fishing",
    "surfing", "skiing", "juggling", "yawning", "sneezing", "stretching",
    "typing", "waving", "whistling", "yoga", "bowling", "boxing", "cycling"
  ],
  places: [
    "beach", "mountain", "forest", "castle", "library", "museum", "airport",
    "hospital", "school", "stadium", "lighthouse", "volcano", "desert", "cave",
    "farm", "jungle", "kitchen", "office", "park", "restaurant", "temple",
    "tower", "tunnel", "waterfall", "zoo", "bridge", "harbor", "island"
  ],
  vehicles: [
    "airplane", "submarine", "helicopter", "motorcycle", "skateboard", "hot air balloon",
    "spaceship", "sailboat", "train", "tractor", "ambulance", "fire truck",
    "bulldozer", "kayak", "scooter", "gondola", "zeppelin", "hovercraft"
  ]
};

const ALL_WORDS = Object.values(WORDS).flat();

function getRandomWords(count = 3) {
  const shuffled = [...ALL_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getWordsByCategory(category, count = 3) {
  const words = WORDS[category] || ALL_WORDS;
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { WORDS, ALL_WORDS, getRandomWords, getWordsByCategory };
