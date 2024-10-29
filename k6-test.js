import http from 'k6/http';
import { browser } from 'k6/browser';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: [
      {
        threshold: 'rate<0.15', // http errors should be less than 10%
        abortOnFail: true,
        delayAbortEval: '10s', 
      },
    ],   
    http_req_duration: [
      {
        threshold: 'p(95) < 2500',// 95% of requests should be below 2s
        abortOnFail: true,
        delayAbortEval: '10s', 
      },
    ], 
  },
  scenarios: {
    performance: {
      executor: 'ramping-vus',
      stages : [
        { duration: '10s', target: 10 }, 
        { duration: '30s', target: 20 }, 
        { duration: '30s', target: 40 }, 
        { duration: '30s', target: 80 }, 
        { duration: '30s', target: 160 }, 
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
  const res = http.get('https://nodebb-team-bulbasaur1.azurewebsites.net/');
  sleep(1);
};

export async function ui_test(){
  const page = await browser.newPage();
  try {

    //login as admin
    await page.goto('https://nodebb-team-bulbasaur1.azurewebsites.net/login');
    await page.locator('input[name="username"]').fill('admin');
    await page.locator('input[name="password"]').fill('bulbasaur');
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      submitButton.click()
    ]);

    // go to testing topic
    await page.goto("https://nodebb-team-bulbasaur1.azurewebsites.net/topic/5/do-not-post-here", { waitUntil: 'networkidle' });

    // test for solve/unsolve in topic
    await page.waitForSelector('div[component="topic/solve"]');
    const solveButton = page.locator('div[component="topic/solve"]');
    const solveButtonStatus = await solveButton.textContent();
    console.log('solveButtonStatus:', solveButtonStatus);
    const newSolveButton = page.locator('div[component="topic/solve"]');
    if (solveButtonStatus && solveButtonStatus.includes('Unsolved')) {
      console.log('Clicking the solve button because status is Unsolved...');
      await solveButton.click();
      await page.waitForTimeout(2000); // Wait for the button state to change after clicking

      // Verify the button has changed to 'Solved'
      const newSolveButtonText = await solveButton.textContent();
      const solvedStatusCheck = newSolveButtonText.includes('Solved');
      console.log(`New solve button status: ${newSolveButtonText}`);
      check(solvedStatusCheck, {
        'is status Solved': (status) => status === true,
      });
    } else {
      console.log('Clicking the solve button because status is Unsolved...');
      await solveButton.click();
      await page.waitForTimeout(2000); // Wait for the button state to change after clicking

      // Verify the button has changed to 'Unsolved'
      const newSolveButtonText = await solveButton.textContent();
      const solvedStatusCheck = newSolveButtonText.includes('Unsolved');
      console.log(`New solve button status: ${newSolveButtonText}`);
      check(solvedStatusCheck, {
        'is status Unsolved': (status) => status === true,
      });
    }
    //reset solve button status
    await solveButton.click();

  
  } finally{
    await page.close();
  }
}