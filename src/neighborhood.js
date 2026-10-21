// Front doors face the closest street: the east-west street at z=4 or north-south street at x=8.
export const NEIGHBORHOOD = {
  rival: { x: 14.7, z: -1.7 },
  houses: [
    {
      id: "coral",
      x: 0,
      z: -7.8,
      yaw: Math.PI / 2,
      width: 4.7,
      wall: "#e77d62",
      roof: "#1e6a80",
    },
    {
      id: "blue",
      x: 14.8,
      z: -7.6,
      yaw: -Math.PI / 2,
      width: 4.2,
      wall: "#2c9ab1",
      roof: "#f2ba53",
    },
    {
      id: "yellow",
      x: -19,
      z: -14.5,
      yaw: 0,
      width: 4.8,
      wall: "#e2b756",
      roof: "#247b8b",
    },
    {
      id: "orange",
      x: 1.3,
      z: -21.2,
      yaw: Math.PI / 2,
      width: 4.7,
      wall: "#d8d9b6",
      roof: "#e17d62",
    },
  ],
  bounds: { minX: -25, maxX: 24, minZ: -29, maxZ: 11 },
};
