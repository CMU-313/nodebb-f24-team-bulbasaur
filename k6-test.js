import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: [
      {
        threshold: 'rate<0.02', 
        abortOnFail: true,
        delayAbortEval: '10s', // string
      },
    ],   // http errors should be less than 2%
    http_req_duration: [
      {
        threshold: 'p(99) < 2000',
        abortOnFail: true,
        delayAbortEval: '10s', // string
      },
    ], // 95% of requests should be below 2s
    checks: ['rate>0.95'],
  },
  scenarios: {
    performance: {
      executor: 'ramping-vus',
      stages : [
        { duration: '1s', target: 10 }, 
        { duration: '10s', target: 20 }, 
        { duration: '10s', target: 40 }, 
        { duration: '10s', target: 80 }, 
        { duration: '10s', target: 160 }, 
        { duration: '10s', target: 360 },
        { duration: '10s', target: 720 },
        { duration: '30s', target: 1440 }, 
        { duration: '30s', target: 2880 }, 
        { duration: '60s', target: 5760 }, 

      ]
    }
  }
};

// The function that defines VU logic.
//
// See https://grafana.com/docs/k6/latest/examples/get-started-with-k6/ to learn more
// about authoring k6 scripts.
//
export default function() {
  // const res = http.get('https://nodebb-team-bulbasaur1.azurewebsites.net');
  const res = http.get('https://test.k6.io');
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  sleep(1);
};

