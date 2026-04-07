import axios from './axios';

export const fetchPayslips = async (month: number, year: number): Promise<any[]> => {
    const response = await axios.get('/api/payroll/payslips', {
        params: { month, year }
    });
    return response.data;
};

export const generatePayslip = async (agentId: number, month: number, year: number): Promise<any> => {
    const response = await axios.post(`/api/payroll/generate/${agentId}`, {
        month, year
    });
    return response.data;
};

export const generateAllPayslips = async (month: number, year: number): Promise<{ generated: number }> => {
    const response = await axios.post(`/api/payroll/generate-all`, {
        month, year
    });
    return response.data;
};
