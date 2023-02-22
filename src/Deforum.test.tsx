/* eslint-disable no-template-curly-in-string */
// Set up Dexie / indexedDB for testing
import { render, screen, waitFor } from '@testing-library/react';
import Dexie from "dexie";
import "fake-indexeddb/auto";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import 'jest-canvas-mock';
import {
  BrowserRouter, Route, Routes
} from "react-router-dom";
import Deforum from './Deforum';
import * as utils from './utils';

//@ts-ignore
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

TimeAgo.addDefaultLocale(en);

jest.mock('react-chartjs-2', () => ({
  Line: () => null
}));
jest.mock('chartjs-plugin-crosshair', () => ({
  CrosshairPlugin: () => null
}));
jest.mock('chartjs-plugin-dragdata', () => null);
jest.mock('chartjs-plugin-annotation', () => ({
  annotationPlugin: () => null
}));


jest.mock('chart.js', () => ({
  Chart: {
    register: () => { },
  }
}));

jest.mock('@xzdarcy/react-timeline-editor', () => ({
  Timeline: () => null,
  TimelineEffect: () => null,
  TimelineRow: () => null,
}));


async function loadAndRender(fixture: {}) {

  // Mock version number and timestamp to ensure consistent snapshots.
  jest.spyOn(utils, 'getUTCTimeStamp').mockReturnValue('0.0.test');
  jest.spyOn(utils, 'getVersionNumber').mockReturnValue('Sun, 01 Jan 2023 14:00:00 GMT');

  // Mock query params with test fixture.
  // TODO this overrides all query param lookups, when we really only want to override when the key is "parseq".
  jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => JSON.stringify(fixture));

  // Render the app
  render(<BrowserRouter><Routes><Route path="*" element={<Deforum />} /></Routes></BrowserRouter>);

  // Wait for Parseq to complete
  await waitFor(() => {
    expect(screen.getAllByTestId("render-button")[0]).toHaveTextContent("Re-render");
  }, { timeout: 10000 });
}


test('Blank document', async () => {
  const fixture = {
    "prompts": {
      "positive": "",
      "negative": ""
    },
    "keyframes": [
      {
        "frame": 0,
        "seed": -1,
      },
      {
        "frame": 10
      }
    ]
  };
  await loadAndRender(fixture);
  expect(screen.getByTestId("output")).toMatchSnapshot();
});

test('Multiple evals in prompts', async () => {
  const fixture = {
    "prompts": {
      "positive": "(cat:${prompt_weight_1})\n(dog:${-prompt_weight_1})",
      "negative": "(blurry:${10*prompt_weight_1})\n(happy:${-prompt_weight_1/10})",
    },
    "keyframes": [
      {
        "frame": 0,
        "prompt_weight_1": 0
      },
      {
        "frame": 10,
        "prompt_weight_1": 10
      }
    ]
  };
  await loadAndRender(fixture);
  expect(screen.getByTestId("output")).toMatchSnapshot();
});

test('Full prodigy', async () => {
  const fixture = {
    "prompts": {
      "positive": "Realistic eyeball, photorealism, centered, photo, realistic, organic, dense, beautiful detail, fine textures, intense, volumetric lighting, cinematic lighting :${prompt_weight_1} AND\nRealistic ancient vicious snakes with open mouths, fangs, biting camera, photorealism, centered, photo, realistic, organic, dense, beautiful detail, fine textures, intense, volumetric lighting, cinematic lighting  :${prompt_weight_2} AND\nRealistic mushrooms, photorealism, centered, photo, realistic, organic, dense, beautiful detail, fine textures, intense, volumetric lighting, cinematic lighting  :${prompt_weight_3} AND\nLSD blotter, powder, pills, illegal drugs, syringe, photorealism, centered, photo, realistic, organic, dense, beautiful detail, fine textures, intense, volumetric lighting, cinematic lighting  :${prompt_weight_4}",
      "negative": "empty, boring, blank space, black, dark, cartoon, drawing, painting, low quality, noisy, grainy, watermark, signature, logo, writing, text, person, people, human, baby, cute, young, simple, cartoon, face, uncanny valley, deformed, silly"
    },
    "options": {
      "bpm": 140,
      "output_fps": "30",
    },
    "keyframes": [
      {
        "frame": 0,
        "seed": 606,
        "scale": 30,
        "strength": 0.55,
        "rotation_3d_x": 5,
        "rotation_3d_y": 5,
        "rotation_3d_z": 0,
        "translation_x": 0,
        "translation_y": 0,
        "translation_z": 128,
        "loopback_frames": 7,
        "loopback_decay": 0.5,
        "prompt_weight_1": 1,
        "prompt_weight_2": 0,
        "prompt_weight_3": 0,
        "prompt_weight_3_i": "bez()",
        "prompt_weight_4": 0,
        "prompt_weight_4_i": "bez()",
        "rotation_3d_x_i": "sin(period=4b)*L",
        "rotation_3d_y_i": "sin(period=1b)*L",
        "rotation_3d_z_i": "L",
        "translation_z_i": "sin(period=1b)*S*pulse(period=8b, pw=2b)*(1-saw(period=2b))*sq(period=16b, ps=8b) \n+ -sin(period=1b)*S*pulse(period=16b, pw=2b, ps=12b)*(1-saw(period=2b))*sq(period=32b) ",
        "translation_x_i": "S",
        "translation_y_i": "S",
        "loopback_frames_i": "S",
        "prompt_weight_2_i": "bez()",
        "prompt_weight_1_i": "bez()",
        "strength_i": "(S-(pulse(p=4b, a=0.45, pw=2, ps=1.4b)\n   +pulse(p=4b, a=0.45, pw=2, ps=0.6b)))\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.25b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b)\n",
        "prompt_weight_5": 0,
        "noise": 0.08,
        "prompt_weight_6": 0,
        "prompt_weight_7": 0,
        "prompt_weight_8": 0,
        "angle": 0,
        "zoom": 1,
        "perspective_flip_theta": 0,
        "perspective_flip_phi": 0,
        "perspective_flip_gamma": 0,
        "perspective_flip_fv": 50,
        "contrast": 1.05,
        "fov": 40,
        "near": 200,
        "far": 10000,
        "seed_i": "S+saw(p=4b, a=4b)",
        "noise_i": "S+pulse(p=4b, a=0.1, pw=2, ps=2b)",
        "angle_i": null,
        "contrast_i": "L",
        "scale_i": "L",
        "prompt_weight_5_i": "S*(pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.35b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b))",
        "antiblur_kernel": 0,
        "antiblur_sigma": 0,
        "antiblur_amount": 0,
        "antiblur_threshold": 0
      },
      {
        "frame": 129,
        "rotation_3d_x": 0,
        "rotation_3d_y_i": "S",
        "rotation_3d_z": 0,
        "translation_z_i": "",
        "prompt_weight_1": 1,
        "prompt_weight_2": 0,
        "rotation_3d_z_i": "bez(0,0,0,0.8)",
        "strength_i": "S-pulse(p=4b, a=0.3, pw=2)",
        "rotation_3d_x_i": "S",
        "rotation_3d_y": 0,
        "prompt_weight_5_i": "0"
      },
      {
        "frame": 148,
        "rotation_3d_z": -45,
        "rotation_3d_z_i": "",
        "angle_i": null,
        "angle": "",
        "seed_i": null,
        "strength_i": null,
        "rotation_3d_x": ""
      },
      {
        "frame": 167,
        "rotation_3d_z": -90,
        "angle": "",
        "angle_i": null,
        "rotation_3d_y": "",
        "rotation_3d_y_i": null,
        "rotation_3d_x": "",
        "rotation_3d_x_i": null
      },
      {
        "frame": 186,
        "rotation_3d_z": -135,
        "angle": ""
      },
      {
        "frame": 193,
        "rotation_3d_z": -180,
        "rotation_3d_z_i": "bez()",
        "prompt_weight_1": "",
        "prompt_weight_1_i": null,
        "prompt_weight_2": "",
        "angle": "",
        "angle_i": null,
        "seed_i": null
      },
      {
        "frame": 206,
        "rotation_3d_x": "",
        "rotation_3d_y_i": "sin(period=1b)*L",
        "rotation_3d_z": 0,
        "translation_z": "",
        "prompt_weight_1": 0,
        "prompt_weight_1_i": null,
        "prompt_weight_2": 1,
        "angle": "",
        "seed_i": "",
        "rotation_3d_y": 5,
        "rotation_3d_z_i": "S",
        "strength_i": "(S-(pulse(p=4b, a=0.45, pw=2, ps=1.4b)\n   +pulse(p=4b, a=0.45, pw=2, ps=0.6b)))\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.25b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b)\n",
        "prompt_weight_5_i": "S*(pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.35b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b))"
      },
      {
        "frame": 309,
        "rotation_3d_y": 0,
        "translation_z": 128,
        "translation_z_i": null,
        "strength": "",
        "strength_i": "S-pulse(p=4b, a=0.3, pw=2)",
        "rotation_3d_y_i": "sin(period=0.25b)*L",
        "rotation_3d_x": 0,
        "rotation_3d_x_i": "sin(period=0.75b)*L",
        "prompt_weight_5_i": "0",
        "rotation_3d_z": 0,
        "rotation_3d_z_i": "sin(period=0.75b)*L"
      },
      {
        "frame": 334,
        "translation_z": "",
        "translation_z_i": null,
        "prompt_weight_2": 1,
        "prompt_weight_3": 0,
        "rotation_3d_y": 3,
        "rotation_3d_y_i": "",
        "rotation_3d_z": 3,
        "rotation_3d_x": 2
      },
      {
        "frame": 360,
        "translation_z_i": "bez(0.9,0.1,0.9,0.4)",
        "translation_z": -16,
        "strength": "",
        "seed_i": null,
        "rotation_3d_z_i": null,
        "rotation_3d_z": 0,
        "rotation_3d_y": 0,
        "rotation_3d_x": 0,
        "rotation_3d_x_i": "S",
        "rotation_3d_y_i": "S"
      },
      {
        "frame": 373,
        "translation_z": -64,
        "rotation_3d_z_i": null,
        "rotation_3d_z": ""
      },
      {
        "frame": 386,
        "translation_z": -128,
        "prompt_weight_2": "",
        "prompt_weight_2_i": null,
        "prompt_weight_3": "",
        "rotation_3d_z": ""
      },
      {
        "frame": 399,
        "translation_z": -256,
        "translation_z_i": "L",
        "prompt_weight_2": "",
        "prompt_weight_3_i": null,
        "prompt_weight_3": "",
        "seed_i": null,
        "rotation_3d_z": "",
        "rotation_3d_z_i": "bez()",
        "rotation_3d_y": 0
      },
      {
        "frame": 411,
        "rotation_3d_x": 5,
        "rotation_3d_y": 5,
        "translation_z": 128,
        "translation_x": "",
        "translation_x_i": null,
        "translation_y": "",
        "translation_z_i": "sin(period=1b)*S*pulse(period=8b, pw=2b)*(1-saw(period=2b))*sq(period=16b, ps=8b) \n+ -sin(period=1b)*S*pulse(period=16b, pw=2b, ps=12b)*(1-saw(period=2b))*sq(period=32b) ",
        "prompt_weight_2": 0,
        "prompt_weight_3": 1,
        "strength": "",
        "prompt_weight_1": 0,
        "rotation_3d_z": 0,
        "strength_i": "(S-(pulse(p=4b, a=0.45, pw=2, ps=1.4b)\n   +pulse(p=4b, a=0.45, pw=2, ps=0.6b)))\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.25b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b)\n",
        "rotation_3d_y_i": "sin(period=1b)*L",
        "rotation_3d_x_i": "sin(period=4b)*L",
        "prompt_weight_5_i": "S*(pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.35b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b))"
      },
      {
        "frame": 489,
        "translation_y_i": null,
        "translation_y": "",
        "translation_z": ""
      },
      {
        "frame": 540,
        "translation_y": "",
        "translation_y_i": null,
        "rotation_3d_y_i": "S",
        "rotation_3d_y": 0,
        "translation_z_i": "L - saw(p=0.75b)*L",
        "translation_z": 64,
        "strength": "",
        "seed_i": null,
        "prompt_weight_3": 1,
        "strength_i": "S-pulse(p=4b, a=0.3, pw=2)",
        "rotation_3d_x": 0,
        "rotation_3d_x_i": "S",
        "prompt_weight_5_i": "0"
      },
      {
        "frame": 579,
        "translation_y_i": null,
        "translation_y": "",
        "prompt_weight_3": "",
        "prompt_weight_2": 0,
        "prompt_weight_1": 0,
        "strength_i": ""
      },
      {
        "frame": 604,
        "translation_z": -512,
        "prompt_weight_3": "",
        "strength_i": ""
      },
      {
        "frame": 617,
        "translation_y": "",
        "translation_y_i": null,
        "rotation_3d_y": 5,
        "translation_z": 128,
        "prompt_weight_3": "",
        "prompt_weight_2": "",
        "prompt_weight_1": "",
        "prompt_weight_4": "",
        "prompt_weight_4_i": null,
        "strength": "",
        "translation_z_i": "sin(period=1b)*S*pulse(period=8b, pw=2b)*(1-saw(period=2b))*sq(period=16b, ps=8b) \n+ -sin(period=1b)*S*pulse(period=16b, pw=2b, ps=12b)*(1-saw(period=2b))*sq(period=32b) ",
        "seed_i": null,
        "scale": "",
        "strength_i": "(S-(pulse(p=4b, a=0.45, pw=2, ps=1.4b)\n   +pulse(p=4b, a=0.45, pw=2, ps=0.6b)))\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=1.25b)\n+pulse(p=4b, a=(0.9-S), pw=0.5b, ps=0.45b)\n",
        "rotation_3d_y_i": "sin(period=1b)*L",
        "rotation_3d_x_i": "sin(period=4b)*L",
        "rotation_3d_x": 5
      },
      {
        "frame": 694,
        "rotation_3d_x": "",
        "rotation_3d_y": "",
        "translation_y": "",
        "translation_y_i": null,
        "loopback_frames": 10,
        "loopback_decay": 0,
        "loopback_decay_i": "L+sin(p=1b)*L",
        "strength_i": "",
        "noise": "",
        "prompt_weight_4": "",
        "prompt_weight_3": "",
        "scale": ""
      },
      {
        "frame": 720,
        "translation_y": "",
        "translation_y_i": null,
        "loopback_frames": "",
        "strength": 0.55,
        "strength_i": "L",
        "noise": "",
        "rotation_3d_z": 0,
        "rotation_3d_z_i": "L",
        "angle": "",
        "angle_i": null,
        "seed_i": "",
        "prompt_weight_3": 1,
        "prompt_weight_4": 0,
        "noise_i": "S"
      },
      {
        "frame": 759,
        "rotation_3d_y": 0,
        "loopback_frames": "",
        "loopback_decay": 0.8,
        "loopback_decay_i": "C",
        "strength": "",
        "prompt_weight_3": "",
        "prompt_weight_4": "",
        "rotation_3d_x": 0,
        "rotation_3d_y_i": "S",
        "translation_z_i": "L",
        "translation_z": 0,
        "rotation_3d_x_i": "sin(period=4b)*L"
      },
      {
        "frame": 798,
        "rotation_3d_z": 180,
        "rotation_3d_z_i": "bez(0.5,0.1,1,0.5)",
        "prompt_weight_4": 1,
        "prompt_weight_3": 0
      },
      {
        "frame": 823,
        "translation_z": 256,
        "prompt_weight_1": 0,
        "prompt_weight_2": 0,
        "prompt_weight_3": "",
        "prompt_weight_4": "",
        "loopback_frames": 1,
        "loopback_frames_i": "L",
        "loopback_decay": 0.05,
        "loopback_decay_i": "L",
        "noise": "",
        "noise_i": null,
        "rotation_3d_x": 2,
        "rotation_3d_z": 360,
        "seed_i": null,
        "angle": "",
        "strength": "",
        "rotation_3d_y_i": "sin(period=1b)*L",
        "rotation_3d_y": 5,
        "translation_z_i": "bez(0.5,0.1,1,0.5)",
        "rotation_3d_x_i": "sin(period=4b)*L"
      },
      {
        "frame": 893,
        "seed": 606,
        "scale": 30,
        "strength": 0.45,
        "rotation_3d_x": 5,
        "rotation_3d_y": 10,
        "rotation_3d_z": 360,
        "translation_x": 0,
        "translation_y": 0,
        "translation_z": 1500,
        "loopback_frames": 10,
        "loopback_decay": 0.2,
        "prompt_weight_1": 0,
        "prompt_weight_2": 0,
        "prompt_weight_3": 0,
        "prompt_weight_4": 1,
        "noise": 0.08,
        "far": 10000,
        "near": 200,
        "fov": 40,
        "contrast": 1.05,
        "perspective_flip_fv": 50,
        "perspective_flip_gamma": 0,
        "perspective_flip_phi": 0,
        "perspective_flip_theta": 0,
        "zoom": 1,
        "angle": 0,
        "prompt_weight_8": 0,
        "prompt_weight_7": 0,
        "prompt_weight_6": 0,
        "prompt_weight_5": 0,
        "noise_i": "",
        "antiblur_threshold": 0,
        "antiblur_amount": 0,
        "antiblur_sigma": 0,
        "antiblur_kernel": 0
      }
    ]
  };
  await loadAndRender(fixture);
  expect(screen.getByTestId("output")).toMatchSnapshot();
});