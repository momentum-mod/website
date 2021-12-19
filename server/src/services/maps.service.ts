import { Injectable } from '@nestjs/common';
import { Map } from '@prisma/client';
import { PagedResponseDto } from "../dto/api-response.dto";
import { MapsRepo } from "../repositories/maps.repo";

@Injectable()
export class MapsService {
	getAll(skip?: number, take?: number): PagedResponseDto<Map[]> {
		const response: Map[] = [
			{
				id: 1,
				downloadURL: "https://google.co.uk",
				name: "map1",
				hash: "ijahS98DY121!£$£$*t",
				statusFlag: 1,
				type: 2,
				createdAt: new Date(),
				updatedAt: new Date(),
				submitterID: 1,
				thumbnailID: 1,		
			},
			{
				id: 2,
				downloadURL: "https://bing.co.uk",
				name: "map2",
				hash: "ijahS98DY121!£$£$*t",
				statusFlag: 2,
				type: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
				submitterID: 6,
				thumbnailID: 3,		
			},
		]

		return { 
			totalCount: 100,
			returnCount: response.length,
			response: response
		}
	}

	get(id: number): Map {
		return {
			id: 1,
			downloadURL: "https://google.co.uk",
			name: "map1",
			hash: "ijahS98DY121!£$£$*t",
			statusFlag: 1,
			type: 2,
			createdAt: new Date(),
			updatedAt: new Date(),
			submitterID: 1,
			thumbnailID: 1,		
		
	
		}
	}
}
