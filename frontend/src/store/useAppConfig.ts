import { create } from 'zustand'
import axios from 'axios'

interface AppConfigState {
    region: string
    regions: string[]
    mobileMoney: boolean
    offlineMode: boolean
    themeColor: string
    isLoading: boolean
    fetchConfig: () => Promise<void>
    setRegion: (region: string) => void
    addRegion: (region: string) => void
}

export const useAppConfig = create<AppConfigState>((set, get) => ({
    region: 'Chargement...',
    regions: ['France', 'Cameroun'], // Defaults
    mobileMoney: false,
    offlineMode: false,
    themeColor: 'blue-600',
    isLoading: true,

    setRegion: (region: string) => {
        let themeColor = 'blue-600'
        if (region.includes('Cameroun') || region.includes('Afrique')) {
            themeColor = 'emerald-600'
        }
        set({ region, themeColor })
    },

    addRegion: (newRegion: string) => {
        const { regions } = get()
        if (!regions.includes(newRegion)) {
            set({ regions: [...regions, newRegion] })
        }
    },

    fetchConfig: async () => {
        try {
            set({ isLoading: true })
            const response = await axios.get('/api')
            const config = response.data.configuration

            // Initialize with backend config but respect local enhancements
            const initialRegion = config.region === 'CM' ? 'Cameroun' : 'France'

            get().setRegion(initialRegion)

            set({
                mobileMoney: config.features.mobileMoney,
                offlineMode: config.features.offlineMode || false,
                isLoading: false
            })
        } catch (error) {
            console.error('Erreur lors de la récupération de la config:', error)
            set({ isLoading: false })
        }
    },
}))
