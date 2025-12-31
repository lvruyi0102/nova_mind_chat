/**
 * NovaAvatar 组件
 * 显示 Nova 的动态像素点形象
 */

import React, { useEffect, useRef, useState } from 'react';
import PixelArtGenerator, { AvatarMood } from '@/lib/pixelArtGenerator';

interface NovaAvatarProps {
  mood?: AvatarMood;
  size?: number;
  scale?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  animated?: boolean;
  className?: string;
}

export const NovaAvatar: React.FC<NovaAvatarProps> = ({
  mood = 'neutral',
  size = 32,
  scale = 3,
  primaryColor = '#4F46E5',
  secondaryColor = '#E0E7FF',
  accentColor = '#818CF8',
  animated = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const generatorRef = useRef<PixelArtGenerator | null>(null);

  // 生成像素艺术
  useEffect(() => {
    if (!generatorRef.current) {
      generatorRef.current = new PixelArtGenerator({
        size,
        scale,
        mood,
        primaryColor,
        secondaryColor,
        accentColor,
      });
    } else {
      generatorRef.current.updateConfig({
        size,
        scale,
        mood,
        primaryColor,
        secondaryColor,
        accentColor,
      });
    }

    const canvas = generatorRef.current.generate();
    setGeneratedImage(canvas.toDataURL('image/png'));
  }, [mood, size, scale, primaryColor, secondaryColor, accentColor]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size * scale + 16,
        height: size * scale + 16,
      }}
    >
      <div
        className={`flex items-center justify-center rounded-lg p-2 ${
          animated ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: secondaryColor + '20',
          border: `2px solid ${primaryColor}`,
        }}
      >
        <img
          src={generatedImage}
          alt="Nova Avatar"
          style={{
            width: size * scale,
            height: size * scale,
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  );
};

export default NovaAvatar;
