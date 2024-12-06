import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/SupabaseClient';

const RealTimeFaceRecognition: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [members, setMembers] = useState<{ id: number; name: string; descriptor: Float32Array | null }[]>([]);
  const [deskOwner, setDeskOwner] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deskOwnerPresent, setDeskOwnerPresent] = useState(false);
  const [isCommunications, setIsCommunications] = useState(false);
  const [isEmotional, setIsEmotional] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('FaceAPIモデルがロードされました');
        setModelsLoaded(true);
      } catch (error) {
        console.error('モデルのロードに失敗しました:', error);
        setModelsLoaded(false);
      }
    };

    const loadMembers = async () => {
      const { data, error } = await supabase.from('member').select('id, name, image_url');
      if (error) {
        console.error('メンバー情報の取得に失敗しました:', error);
        return;
      }

      const membersWithDescriptors = await Promise.all(
        data.map(async (member: { id: number; name: string; image_url: string }) => {
          const descriptor = await getFaceDescriptorFromUrl(member.image_url);
          return { id: member.id, name: member.name, descriptor };
        })
      );

      setMembers(membersWithDescriptors);
    };

    loadModels();
    loadMembers();
  }, []);

  const getFaceDescriptorFromUrl = async (imageUrl: string): Promise<Float32Array | null> => {
    try {
      const img = await faceapi.fetchImage(imageUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection?.descriptor || null;
    } catch (error) {
      console.error('URL画像からの顔特徴量取得に失敗:', error);
      return null;
    }
  };

  const getFaceDescriptorsAndExpressionsFromWebcam = useCallback(async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      console.error('Webカメラが利用できません');
      return [];
    }

    if (!modelsLoaded) {
      console.error('モデルがロードされていません');
      return [];
    }

    const video = webcamRef.current.video;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      return detections;
    } catch (error) {
      console.error('Webカメラから顔特徴量や感情を取得中にエラーが発生しました:', error);
      return [];
    }
  }, [modelsLoaded]);

  const identifyMember = useCallback(async () => {
    if (isProcessing || !deskOwner || !modelsLoaded) return;

    setIsProcessing(true);

    const detections = await getFaceDescriptorsAndExpressionsFromWebcam();
    if (!detections || detections.length === 0) {
      console.error('顔が検出されませんでした');
      setDeskOwnerPresent(false);
      setIsProcessing(false);
      return;
    }

    let ownerDetected = false;
    let id1Detected = false;
    let id1Expression = '';

    detections.forEach((detection) => {
      const descriptor = detection.descriptor;

      members.forEach((member) => {
        if (member.descriptor) {
          const distance = faceapi.euclideanDistance(descriptor, member.descriptor);

          if (member.id === deskOwner && distance < 0.6) {
            ownerDetected = true;
          }

          if (member.id === 2 && distance < 0.6) {
            id1Detected = true;

            const expressions = detection.expressions;
            const maxExpression = Object.keys(expressions).reduce((a, b) =>
              expressions[a as keyof faceapi.FaceExpressions] > expressions[b as keyof faceapi.FaceExpressions] ? a : b
            );
            id1Expression = maxExpression;
          }
        }
      });
    });

    setDeskOwnerPresent(ownerDetected);

    if (ownerDetected && id1Detected) {
      const communicationVolume = id1Expression === 'happy' ? 5 : 1;
      setIsEmotional(id1Expression === 'happy');

      const { error } = await supabase.from('communication').insert([
        {
          sender_id: 1,
          receiver_id: deskOwner,
          communication_date: new Date().toISOString(),
          communication_volume: communicationVolume,
        },
      ]);

      if (error) {
        console.error('communicationテーブルへのデータ挿入に失敗しました:', error);
      } else {
        console.log('communicationテーブルにデータを挿入しました');
        setIsCommunications(true);
      }
    } else if (id1Detected) {
      console.log('高田さんがカメラにいますが、デスクの持ち主がいません');
      setIsCommunications(false);
    } else if (ownerDetected) {
      console.log('デスクの持ち主がいますが、高田さんがいません');
      setIsCommunications(false);
    } else {
      console.log('別の人がカメラに映っています。');
      setIsCommunications(false);
    }

    setIsProcessing(false);
  }, [members, deskOwner, modelsLoaded, isProcessing, getFaceDescriptorsAndExpressionsFromWebcam]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      identifyMember();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [identifyMember]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <select
          onChange={(e) => setDeskOwner(Number(e.target.value))}
          value={deskOwner || ''}
          style={{ marginBottom: '10px', marginLeft: '15px' }}
        >
          <option value="" disabled>
            デスクの持ち主を選択
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <p style={{ marginTop: '15px', marginRight: '15px' }}>
          {deskOwnerPresent ? 'デスクの持ち主がカメラにいます' : 'デスクの持ち主がカメラにいません'}
        </p>
      </div>
      <p style={{ color: 'red' }}>
        {isCommunications
          ? isEmotional
            ? 'communication happened!! & Happy!!'
            : 'communication happened!!'
          : ''}
      </p>
      <Webcam ref={webcamRef} style={{ width: '100%', height: 'auto' }} />
    </div>
  );
};

export default RealTimeFaceRecognition;
