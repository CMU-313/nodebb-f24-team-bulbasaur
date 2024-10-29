import http from 'k6/http';
import { browser } from 'k6/browser';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: [
      {
        threshold: 'rate<0.10', 
        abortOnFail: true,
        delayAbortEval: '10s', // string
      },
    ],   // http errors should be less than 2%
    http_req_duration: [
      {
        threshold: 'p(95) < 2000',
        abortOnFail: true,
        delayAbortEval: '10s', // string
      },
    ], // 95% of requests should be below 2s
    checks: [
      {
        threshold: 'rate>0.90'
      },
    ],
  },
  scenarios: {
    performance: {
      executor: 'ramping-vus',
      stages : [
        // { duration: '1s', target: 1 }, 
        { duration: '30s', target: 10 }, 
        { duration: '30s', target: 20 }, 
        { duration: '30s', target: 40 }, 
        { duration: '30s', target: 80 }, 
        { duration: '30s', target: 160 }, 
        { duration: '30s', target: 0 }, 
      ]
    }, 
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
      exec: 'ui_test',
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
  const res = http.get('https://nodebb-team-bulbasaur1.azurewebsites.net/');
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  sleep(1);
};

export async function ui_test(){
  const page = await browser.newPage();
  try {
    // await page.screenshot({ path: 'screenshots/homepage.png' });
    //login as admin
    await page.goto('https://nodebb-team-bulbasaur1.azurewebsites.net/login');
    // await page.screenshot({ path: 'screenshots/login-page.png' });
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('bulbasaur');
    // await page.screenshot({ path: 'screenshots/after-login-in.png' });
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([page.waitForNavigation(), submitButton.click()]);
    // await page.screenshot({ path: 'screenshots/after-login-in.png' });
    
    // await page.goto("https://nodebb-team-bulbasaur1.azurewebsites.net/");
    
    // await page.goto("https://nodebb-team-bulbasaur1.azurewebsites.net/category/1/announcements");
    // await page.screenshot({ path: 'screenshots/category.png' });
    // const title = page.locator('a[component="topic/header"]');
    // console.log(title.title);
    // check(title, {
    //   'has right title': (r) => r.title === 'DO NOT POST HERE',
    // })
    // await Promise.all([page.waitForNavigation(), title.click()]);
    await page.goto("https://nodebb-team-bulbasaur1.azurewebsites.net/topic/5/do-not-post-here")
    await page.screenshot({ path: 'screenshots/topic.png' });

    const solveButton = page.locator('div[component="post/solve"]');
    await solveButton.click();
    await page.screenshot({ path: 'screenshots/topic.png' });
  
  } finally{
    await page.close();
  }
}