import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { HttpEvent } from '@angular/common/http';
import {
  CreateMapCredit,
  MMap,
  MapCredit,
  MapImage,
  MapsGetAllQuery,
  MapsGetQuery,
  CreateMapWithFiles,
  MapsGetAllSubmissionQuery,
  PagedResponse,
  MapReviewsGetQuery,
  MapReview,
  MapReviewComment,
  CreateMapReviewComment,
  PagedQuery,
  UpdateMapReviewComment,
  CreateMapReviewWithFiles,
  UpdateMapReview,
  UpdateMap,
  UpdateMapImagesWithFiles,
  CreateMapSubmissionVersionWithFiles,
  CreateMapTestInvite
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class MapsService {
  constructor(private http: HttpService) {}

  getMap(nameOrId: number | string, query?: MapsGetQuery): Observable<MMap> {
    return this.http.get<MMap>(`maps/${nameOrId}`, { query });
  }

  testMapExists(
    id: number | string,
    query?: MapsGetQuery
  ): Observable<boolean> {
    return this.http.get<MMap>(`maps/${id}`, { query }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  getMapSubmissions(
    query?: MapsGetAllSubmissionQuery
  ): Observable<PagedResponse<MMap>> {
    return this.http.get<PagedResponse<MMap>>('maps/submissions', { query });
  }

  getMaps(query?: MapsGetAllQuery): Observable<PagedResponse<MMap>> {
    return this.http.get<PagedResponse<MMap>>('maps', { query });
  }

  updateMap(mapID: number, body: UpdateMap): Observable<MMap> {
    return this.http.patch(`maps/${mapID}`, { body });
  }

  getMapCredits(mapID: number): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`maps/${mapID}/credits`);
  }

  updateMapCredits(
    mapID: number,
    body: CreateMapCredit[]
  ): Observable<MapCredit[]> {
    return this.http.put<MapCredit[]>(`maps/${mapID}/credits`, { body });
  }

  submitMap({
    bsp,
    data,
    vmfs
  }: CreateMapWithFiles): Observable<HttpEvent<string>> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(data));
    formData.append('bsp', bsp, bsp.name);
    for (const vmf of vmfs ?? []) formData.append('vmfs', vmf, vmf.name);

    return this.http.post('maps', {
      body: formData,
      reportProgress: true,
      observe: 'events',
      responseType: 'text'
    });
  }

  submitMapVersion(
    mapID: number,
    { bsp, data, vmfs }: CreateMapSubmissionVersionWithFiles
  ): Observable<HttpEvent<string>> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(data));
    formData.append('bsp', bsp, bsp.name);
    for (const vmf of vmfs ?? []) formData.append('vmfs', vmf, vmf.name);

    return this.http.post(`maps/${mapID}`, {
      body: formData,
      reportProgress: true,
      observe: 'events',
      responseType: 'text'
    });
  }

  // TODO: Remove this endpoint, we should never stream from S3 -> backend -> consumer.
  downloadMapFile(id: number): Observable<Blob> {
    return this.http.get(`maps/${id}/download`, {
      responseType: 'blob'
    });
  }

  updateMapImages(
    mapID: number,
    update: UpdateMapImagesWithFiles
  ): Observable<MapImage[]> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(update.data));

    if (update.images) {
      for (const image of update.images) {
        formData.append('images', image, image.name);
      }
    }

    return this.http.put(`maps/${mapID}/images`, { body: formData });
  }

  updateMapTestInvites(
    mapID: number,
    invites: CreateMapTestInvite
  ): Observable<void> {
    return this.http.put(`maps/${mapID}/testInvite`, { body: invites });
  }

  getMapReviews(
    id: number,
    query?: MapReviewsGetQuery
  ): Observable<PagedResponse<MapReview>> {
    return this.http.get(`maps/${id}/reviews`, { query });
  }

  postMapReview(
    mapID: number,
    reviewData: CreateMapReviewWithFiles
  ): Observable<MapReview> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(reviewData.data));
    if (reviewData.images) {
      for (const image of reviewData.images) {
        formData.append('images', image, image.name);
      }
    }

    return this.http.post(`maps/${mapID}/reviews`, {
      body: formData
    });
  }

  updateMapReview(
    reviewID: number,
    update: UpdateMapReview
  ): Observable<MapReview> {
    return this.http.patch(`map-review/${reviewID}`, { body: update });
  }

  deleteMapReview(reviewID: number): Observable<void> {
    return this.http.delete(`map-review/${reviewID}`);
  }

  getMapReviewComments(
    reviewID: number,
    query?: PagedQuery
  ): Observable<PagedResponse<MapReviewComment>> {
    return this.http.get(`map-review/${reviewID}/comments`, { query });
  }

  postMapReviewComment(
    reviewID: number,
    comment: string
  ): Observable<MapReviewComment> {
    return this.http.post(`map-review/${reviewID}/comments`, {
      body: { text: comment } as CreateMapReviewComment
    });
  }

  updateMapReviewComment(
    commentID: number,
    comment: string
  ): Observable<MapReviewComment> {
    return this.http.patch(`map-review/comments/${commentID}`, {
      body: { text: comment } as UpdateMapReviewComment
    });
  }

  deleteMapReviewComment(commentID: number): Observable<void> {
    return this.http.delete(`map-review/comments/${commentID}`);
  }
}
