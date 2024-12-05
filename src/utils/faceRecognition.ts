import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';

/**
 * 顔認識モデルのロード
 */
export const loadFaceApiModels = async () => {
  const MODEL_URL = '/models'; // モデルが配置されているURL（public/modelsディレクトリ）
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
};

/**
 * URLから画像をロードして顔認識
 * @param imageUrl 画像URL
 * @returns 顔の特徴量（descriptor）またはnull
 */
export const getFaceDescriptorFromUrl = async (imageUrl: string) => {
  const img = await faceapi.fetchImage(imageUrl);
  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    console.error('画像URLから顔が検出されませんでした。');
    return null;
  }

  return detection.descriptor;
};

/**
 * Webカメラ映像から顔認識
 * @param webcamRef Webカメラの参照
 * @returns 顔の特徴量（descriptor）またはnull
 */
export const getFaceDescriptorFromWebcam = async (webcamRef: React.RefObject<Webcam>) => {
  if (!webcamRef.current || !webcamRef.current.video) {
    console.error('Webカメラが利用できません。');
    return null;
  }

  const video = webcamRef.current.video;

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    console.error('Webカメラから顔が検出されませんでした。');
    return null;
  }

  return detection.descriptor;
};

/**
 * 2つの顔特徴量を比較して一致度を判定
 * @param descriptor1 顔特徴量1
 * @param descriptor2 顔特徴量2
 * @returns 一致度（0.6以下で一致と判定）
 */
export const compareFaceDescriptors = (descriptor1: Float32Array, descriptor2: Float32Array) => {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  console.log('一致度:', distance);
  return distance < 0.6; // 一致と判定する閾値（0.6は一般的）
};
