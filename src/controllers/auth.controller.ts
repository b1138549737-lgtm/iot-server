import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';

export async function wxLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Missing wx.login code', 400);
    }

    // Call WeChat API to get openid
    const appId = process.env.WECHAT_APPID;
    const appSecret = process.env.WECHAT_SECRET;

    if (!appId || !appSecret || appId === 'your_appid_here') {
      // Development mode: use test openid
      logger.warn('Using development mode login');
      const testOpenid = `test_openid_${Date.now()}`;

      let user = await User.findOne({ openid: testOpenid });
      if (!user) {
        user = await User.create({
          openid: testOpenid,
          nickname: 'Test User',
        });
      }

      const token = jwt.sign(
        { userId: user._id, openid: user.openid },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
      );

      sendSuccess(res, { token, user }, 'Login success (dev mode)');
      return;
    }

    // Production mode: call WeChat API
    const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: appId,
        secret: appSecret,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });

    const { openid, session_key } = wxResponse.data;

    if (!openid) {
      throw new AppError('Failed to get openid from WeChat', 400);
    }

    // Find or create user
    let user = await User.findOne({ openid });
    if (!user) {
      user = await User.create({ openid });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, openid: user.openid },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Store session_key (in production, use Redis)
    logger.debug(`User ${openid} logged in, session_key: ${session_key}`);

    sendSuccess(res, { token, user }, 'Login success');
  } catch (error) {
    next(error);
  }
}

export async function getUserInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateUserInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const { nickname, avatar } = req.body;
    const updateData: { nickname?: string; avatar?: string } = {};

    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user.userId, updateData, { new: true });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendSuccess(res, user, 'User info updated');
  } catch (error) {
    next(error);
  }
}
