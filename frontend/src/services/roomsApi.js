import api from './api';

export const roomsAPI = {
  getRooms:             (params = {}) => api.get('/rooms', { params }),
  getFeeConfig:         ()            => api.get('/rooms/config'),
  getRoomById:          (id)          => api.get(`/rooms/${id}`),
  createRoom:           (data)        => api.post('/rooms', data),
  updateRoom:           (id, data)    => api.put(`/rooms/${id}`, data),
  deleteRoom:           (id)          => api.delete(`/rooms/${id}`),
  updateBedMaintenance: (roomId, bedId, data) =>
    api.patch(`/rooms/${roomId}/beds/${bedId}/maintenance`, data),
};
