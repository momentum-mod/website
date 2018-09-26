import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
	providedIn: 'root'
})
export class UserService {

	private id: number;
	private displayName: string;
	private avatar: string;
	private permissions: number;

	constructor(private authService: AuthService) {
		const userInfo = this.authService.getAccessTokenPayload();
		if (userInfo !== null) {
			this.id = userInfo.id;
			this.displayName = userInfo.displayName;
			this.avatar = userInfo.avatar;
			this.permissions = userInfo.permissions;
		}
	}

	public getInfo() {
		return {
			id: this.id,
			displayName: this.displayName,
			avatar: this.avatar,
			permissions: this.permissions
		}
	}

}
