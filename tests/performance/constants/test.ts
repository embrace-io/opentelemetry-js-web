const BASE_URL = 'http://localhost:3000';
// Make it match ${BASE_URL}/v1/logs and ${BASE_URL}/v1/traces
const API_REGEX = new RegExp(`^${BASE_URL}/v1/(logs|traces)$`);

export { API_REGEX, BASE_URL };
