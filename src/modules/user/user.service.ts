import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserOptions } from 'modules/user/user.types';
import { Model } from 'mongoose';
import { CreateUserDto } from './create-user.dto';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  getLocale = async (options: UserOptions): Promise<string> => {
    const user = await this.userModel.findOne(options);
    if (!user) throw new Error("User doesn't exist");

    return user.locale;
  };

  getUser = async (options: UserOptions): Promise<User> => {
    const user = await this.userModel.findOne(options);
    if (!user) throw new Error("User doesn't exist");

    return user;
  };

  registerUser = async (userDto: CreateUserDto): Promise<User> => {
    const user = await this.userModel.findOne({
      messenger_id: userDto.messenger_id,
    });
    if (!user) {
      const newUser = new this.userModel(userDto);
      return newUser.save();
    }
    return user;
  };

  validateUser = async (options: UserOptions): Promise<User> => {
    const user = await this.userModel.findOne(options);
    if (!user) return;

    return user;
  };
}
