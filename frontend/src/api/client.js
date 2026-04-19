import axios from 'axios';
import { resolveApiBaseUrl } from './baseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인터셉터 등을 추가할 수 있습니다. (필요 시)

export default apiClient;
