// live: true  → shown as available to search
// live: false → shown as "Coming soon", triggers the request-your-city flow
export const LAUNCH_CITIES = [
    { name: "Indore",     slug: "indore",     live: true },
    { name: "Bhopal",     slug: "bhopal",     live: true },
    { name: "Ujjain",     slug: "ujjain",     live: true },
    { name: "Mumbai",     slug: "mumbai",     live: false },
    { name: "Delhi",      slug: "delhi",      live: false },
    { name: "Bengaluru",  slug: "bengaluru",  live: false },
    { name: "Pune",       slug: "pune",       live: false },
    { name: "Jaipur",     slug: "jaipur",     live: false },
    { name: "Ahmedabad",  slug: "ahmedabad",  live: false },
    { name: "Hyderabad",  slug: "hyderabad",  live: false },
    { name: "Nagpur",     slug: "nagpur",     live: false },
    { name: "Lucknow",    slug: "lucknow",    live: false },
  ];
  
  export const LIVE_CITIES = LAUNCH_CITIES.filter((c) => c.live);