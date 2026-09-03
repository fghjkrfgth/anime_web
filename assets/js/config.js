// -------------------------------------------------------------------------
// GLOBAL CONFIGURATION & GATEWAY REGISTRY
// -------------------------------------------------------------------------

const CLUSTER_MODE = false;

// Base64-encoded URL array (NODE_REGISTRY[0] is the primary Cloudflare Worker proxy)
const NODE_REGISTRY = [
    "aHR0cHM6Ly9hbmltZS1wcm94eS5kYW1uLWRhbW4tZGFtbml0LndvcmtlcnMuZGV2",
    "aHR0cHM6Ly9ub2RlMS5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlMi5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlMy5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlNC5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlNS5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlNi5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlNy5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlOC5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlOS5ibGFja2xlZy50bw==",
    "aHR0cHM6Ly9ub2RlMTAuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTEuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTIuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTMuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTQuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTUuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTYuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTcuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTguYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMTkuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjAuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjEuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjIuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjMuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjQuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjUuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjYuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjcuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjguYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMjkuYmxhY2tsZWcudG8=",
    "aHR0cHM6Ly9ub2RlMzAuYmxhY2tsZWcudG8="
];

let blacklistedIndices = new Set();
let currentHost = "Local Node";

// Runtime Base64 decoder function
function decodeRegistryUrl(encodedStr) {
    return atob(encodedStr);
}

window.VAST_TAG_URL = "https://enchantingboss.com/dfm/F/z.d/GDNJvoZ/G/Ux/AeYmX9HuqZIU/l/k/PUT/cXzcNgjYk/1-N/TcM/tJNqzDMw2cOYTuUY1INPws";



