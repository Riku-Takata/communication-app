import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/SupabaseClient';

// メンバーのインターフェースを定義
interface Member {
  id: number;
  name: string;
  descriptors: Float32Array[];
}

const RealTimeFaceRecognition: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [deskOwner, setDeskOwner] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deskOwnerPresent, setDeskOwnerPresent] = useState(false);
  const [isCommunications, setIsCommunications] = useState(false);
  const [isEmotional, setIsEmotional] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);

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
          if (!descriptor) {
            console.log(`顔特徴量の抽出に失敗したメンバー: ID=${member.id}, Name=${member.name}, ImageURL=${member.image_url}`);
            return null;
          }
          return { id: member.id, name: member.name, descriptors: [descriptor] };
        })
      );

      const validMembers = membersWithDescriptors.filter(
        (member): member is Member => member !== null
      );

      setMembers(validMembers);
      const labeledDescriptors = validMembers.map(member => new faceapi.LabeledFaceDescriptors(member.name, member.descriptors));
      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 閾値を調整
      setFaceMatcher(matcher);
    };

    loadModels();
    loadMembers();
  }, []);

  // 顔特徴量を画像URLから取得する関数
  const getFaceDescriptorFromUrl = async (imageUrl: string): Promise<Float32Array | null> => {
    try {
      const img = await faceapi.fetchImage(imageUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection?.descriptor || null;
    } catch (error) {
      console.error('URL画像からの顔特徴量取得に失敗:', error);
      return null;
    }
  };

  // Webカメラから顔特徴量と感情を取得する関数
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
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      return detections;
    } catch (error) {
      console.error('Webカメラから顔特徴量や感情を取得中にエラーが発生しました:', error);
      return [];
    }
  }, [modelsLoaded]);

  // メンバーを識別する関数
  const identifyMember = useCallback(async () => {
    if (isProcessing || !deskOwner || !modelsLoaded || !faceMatcher) return;

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
    const otherLabels: string[] = []; // 他の人のラベルを格納する配列

    detections.forEach((detection) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

      // デスクの持ち主のチェック
      if (bestMatch.label === deskOwner && bestMatch.distance < 0.6) {
        ownerDetected = true;
      }

      // 特定のメンバー（例: 高田さん）のチェック
      if (bestMatch.label === '高田' && bestMatch.distance < 0.6) {
        id1Detected = true;

        const expressions = detection.expressions;
        const maxExpression = Object.keys(expressions).reduce((a, b) =>
          expressions[a as keyof faceapi.FaceExpressions] > expressions[b as keyof faceapi.FaceExpressions] ? a : b
        );
        id1Expression = maxExpression;
      }

      // デスクの持ち主でも中川さんでもない場合、他の人として収集
      if (
        bestMatch.label !== deskOwner &&
        bestMatch.label !== '高田' &&
        bestMatch.distance < 0.6 &&
        bestMatch.label !== 'unknown' // 'unknown' を除外
      ) {
        otherLabels.push(bestMatch.label);
      }
    });

    setDeskOwnerPresent(ownerDetected);

    if (ownerDetected && id1Detected) {
      const communicationVolume = id1Expression === 'happy' ? 5 : 1;
      setIsEmotional(id1Expression === 'happy');

      const deskOwnerMember = members.find(member => member.name === deskOwner);
      const deskOwnerId = deskOwnerMember ? deskOwnerMember.id : null;

      if (deskOwnerId !== null) {
        const { error } = await supabase.from('communication').insert([
          {
            sender_id: 11,
            receiver_id: deskOwnerId,
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
      } else {
        console.error('デスクの持ち主のIDが見つかりません');
      }
    } else if (id1Detected) {
      console.log('高田さんがカメラにいますが、デスクの持ち主がいません');

      const deskOwnerMember = members.find(member => member.name === deskOwner);
      const deskOwnerId = deskOwnerMember ? deskOwnerMember.id : null;
      const { error } = await supabase.from('communication').insert([
        {
          sender_id: 11,
          receiver_id: deskOwnerId,
          communication_date: new Date().toISOString(),
          communication_volume: 1,
        },
      ]);

      if (error) {
        console.error('communicationテーブルへのデータ挿入に失敗しました:', error);
      } else {
        console.log('communicationテーブルにデータを挿入しました');
        setIsCommunications(true);
      }
    } else if (ownerDetected) {
      console.log('デスクの持ち主がいますが、高田さんがいません');
      setIsCommunications(false);
    } else if (otherLabels.length > 0) { // 他の人が検出された場合
      console.log(`別の人がカメラに映っています: ${otherLabels.join(', ')}`);
      setIsCommunications(false);
    } else {
      console.log('別の人がカメラに映っています。');
      setIsCommunications(false);
    }

    setIsProcessing(false);
  }, [
    faceMatcher,
    isProcessing,
    deskOwner,
    modelsLoaded,
    getFaceDescriptorsAndExpressionsFromWebcam,
    members,
  ]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      identifyMember();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [identifyMember]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <select
          onChange={(e) => setDeskOwner(e.target.value)}
          value={deskOwner || ''}
          style={{ marginBottom: '10px', marginLeft: '15px' }}
        >
          <option value="" disabled>
            デスクの持ち主を選択
          </option>
          {members.map((member) => (
            <option key={member.id} value={member.name}>
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
