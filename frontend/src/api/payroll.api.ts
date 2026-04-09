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

export const downloadPayslipPdf = async (payslipId: number, filename: string) => {
    const response = await axios.get(`/api/payroll/payslips/${payslipId}/pdf`, {
        responseType: 'blob'
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const exportSageOdPaie = async (month: number, year: number, tenantId: string = '') => {
    const response = await axios.get(`/api/payroll/export/sage`, {
        params: { month, year, tenantId },
        responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv; charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const filename = `OD_Paie_${tenantId}_${month}_${year}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const exportDipe = async (month: number, year: number, tenantId: string = '') => {
    const response = await axios.get(`/api/payroll/export/dipe`, {
        params: { month, year, tenantId },
        responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv; charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const filename = `DIPE_CNPS_${tenantId}_${month}_${year}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// --- Rules ---
export const getRules = async () => {
    const response = await axios.get('/api/payroll/rules');
    return response.data;
};

export const createRule = async (data: any) => {
    const response = await axios.post('/api/payroll/rules', data);
    return response.data;
};

export const deleteRule = async (id: number) => {
    const response = await axios.post(`/api/payroll/rules/${id}/delete`);
    return response.data;
};
