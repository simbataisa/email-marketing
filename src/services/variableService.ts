/**
 * Variable management service
 * Handles API calls for global variables, template variables, and variable values
 */
import axios from 'axios';

const API_BASE_URL = '/api/variables';

// Auth headers are now handled by the Axios interceptor in authStore
// No need for manual token management

// Types
export interface GlobalVariable {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'email' | 'url' | 'date';
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  id: string;
  templateId: string;
  name: string;
  displayName: string;
  description?: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'email' | 'url' | 'date';
  createdAt: string;
  updatedAt: string;
}

export interface VariableValue {
  id: string;
  userId: string;
  globalVariableId?: string;
  templateVariableId?: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalVariableData {
  name: string;
  displayName: string;
  description?: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'email' | 'url' | 'date';
}

export interface CreateTemplateVariableData {
  templateId: string;
  name: string;
  displayName: string;
  description?: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'email' | 'url' | 'date';
}

export interface CreateVariableValueData {
  globalVariableId?: string;
  templateVariableId?: string;
  value: string;
}

// Global Variables API
export const globalVariableService = {
  // Get all global variables
  getAll: async (): Promise<GlobalVariable[]> => {
    const response = await axios.get(`${API_BASE_URL}/global`);
    return response.data;
  },

  // Get global variable by ID
  getById: async (id: string): Promise<GlobalVariable> => {
    const response = await axios.get(`${API_BASE_URL}/global/${id}`);
    return response.data;
  },

  // Create global variable
  create: async (data: CreateGlobalVariableData): Promise<GlobalVariable> => {
    const response = await axios.post(`${API_BASE_URL}/global`, data);
    return response.data;
  },

  // Update global variable
  update: async (id: string, data: Partial<CreateGlobalVariableData>): Promise<GlobalVariable> => {
    const response = await axios.put(`${API_BASE_URL}/global/${id}`, data);
    return response.data;
  },

  // Delete global variable
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/global/${id}`);
  }
};

// Template Variables API
export const templateVariableService = {
  // Get all template variables for a template
  getByTemplate: async (templateId: string): Promise<TemplateVariable[]> => {
    const response = await axios.get(`${API_BASE_URL}/template/${templateId}`);
    return response.data;
  },

  // Get template variable by ID
  getById: async (id: string): Promise<TemplateVariable> => {
    const response = await axios.get(`${API_BASE_URL}/template-variable/${id}`);
    return response.data;
  },

  // Create template variable
  create: async (data: CreateTemplateVariableData): Promise<TemplateVariable> => {
    const response = await axios.post(`${API_BASE_URL}/template-variable`, data);
    return response.data;
  },

  // Update template variable
  update: async (id: string, data: Partial<CreateTemplateVariableData>): Promise<TemplateVariable> => {
    const response = await axios.put(`${API_BASE_URL}/template-variable/${id}`, data);
    return response.data;
  },

  // Delete template variable
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/template-variable/${id}`);
  },

  // Extract variables from template content
  extractFromTemplate: async (templateId: string): Promise<TemplateVariable[]> => {
    const response = await axios.post(`${API_BASE_URL}/extract/${templateId}`, {});
    return response.data;
  }
};

// Variable Values API
export const variableValueService = {
  // Get all variable values for user
  getAll: async (): Promise<VariableValue[]> => {
    const response = await axios.get(`${API_BASE_URL}/values`);
    return response.data;
  },

  // Get variable value by ID
  getById: async (id: string): Promise<VariableValue> => {
    const response = await axios.get(`${API_BASE_URL}/values/${id}`);
    return response.data;
  },

  // Create variable value
  create: async (data: CreateVariableValueData): Promise<VariableValue> => {
    const response = await axios.post(`${API_BASE_URL}/values`, data);
    return response.data;
  },

  // Update variable value
  update: async (id: string, data: Partial<CreateVariableValueData>): Promise<VariableValue> => {
    const response = await axios.put(`${API_BASE_URL}/values/${id}`, data);
    return response.data;
  },

  // Delete variable value
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/values/${id}`);
  }
};

// Combined service for easier usage
export const variableService = {
  global: globalVariableService,
  template: templateVariableService,
  values: variableValueService
};

export default variableService;