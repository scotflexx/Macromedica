import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Appointment, AppointmentStatus } from '../types/appointment';

// LocalStorage key
const STORAGE_KEY = 'macromedica_appointments';

// Helper to get from local storage
const getStoredAppointments = (): Appointment[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

// Helper to save to local storage
const saveAppointments = (appointments: Appointment[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
};

// Mock API functions
const api = {
  getAppointments: async (): Promise<Appointment[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return getStoredAppointments();
  },

  createAppointment: async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'status'>): Promise<Appointment> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newAppointment: Appointment = {
      ...appointment,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      status: 'PLANIFIE' // Default as per requirement
    };
    const current = getStoredAppointments();
    saveAppointments([...current, newAppointment]);
    return newAppointment;
  },

  updateStatus: async ({ id, status }: { id: string; status: AppointmentStatus }): Promise<Appointment> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const current = getStoredAppointments();
    const idx = current.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Appointment not found');
    
    current[idx] = { ...current[idx], status };
    saveAppointments(current);
    return current[idx];
  },

  updateAppointment: async (appointment: Appointment): Promise<Appointment> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const current = getStoredAppointments();
    const idx = current.findIndex(a => a.id === appointment.id);
    if (idx === -1) throw new Error('Appointment not found');
    
    current[idx] = appointment;
    saveAppointments(current);
    return appointment;
  }
};

export const useAppointments = () => {
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: api.getAppointments
  });

  const createMutation = useMutation({
    mutationFn: api.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: api.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: api.updateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  return {
    appointments: appointmentsQuery.data || [],
    isLoading: appointmentsQuery.isLoading,
    createAppointment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    updateAppointment: updateAppointmentMutation.mutateAsync
  };
};
