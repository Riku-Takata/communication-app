import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/SupabaseClient';

const RealTimeFaceRecognition: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [members, setMembers] = useState<{ id: number; name: string; descriptor: Float32Array | null }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('FaceAPIモデルがロードされました');
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

  const getFaceDescriptorFromWebcam = async (): Promise<Float32Array | null> => {
    if (!webcamRef.current || !webcamRef.current.video) {
      console.error('Webカメラが利用できません');
      return null;
    }

    const video = webcamRef.current.video;
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor || null;
  };

  const identifyMember = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    const webcamDescriptor = await getFaceDescriptorFromWebcam();
    if (!webcamDescriptor) {
      console.error('Webカメラから顔特徴量を取得できませんでした');
      setIsProcessing(false);
      return;
    }

    let bestMatch: { member: { id: number; name: string; descriptor: Float32Array | null } | null; distance: number } = {
      member: null,
      distance: Infinity,
    };

    members.forEach((member) => {
      if (member.descriptor) {
        const distance = faceapi.euclideanDistance(webcamDescriptor, member.descriptor);
        if (distance < bestMatch.distance) {
          bestMatch = { member, distance };
        }
      }
    });

    if (bestMatch.member !== null) {
      console.log(`一致したメンバー: ${bestMatch.member.name} (ID: ${bestMatch.member.id}), 距離: ${bestMatch.distance}`);
    } else {
      console.log('一致するメンバーが見つかりませんでした');
    }

    setIsProcessing(false);
  }, [members, isProcessing]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      identifyMember();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [identifyMember]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>リアルタイム顔認識</h1>
      <Webcam ref={webcamRef} style={{ width: '100%', height: 'auto' }} />
    </div>
  );
};

export default RealTimeFaceRecognition;
