import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { banlistService } from '../services/banlistService';
import { cardService } from '../services/api';
import type { Banlist, Card, BanlistSection, CardSearchParams } from '../types';
import CardSearchPanel from '../components/common/CardSearchPanel';
import BanlistSections from '../components/banlist/BanlistSections';
import BanlistHeader from '../components/banlist/BanlistHeader';
import BanlistSidebar from '../components/banlist/BanlistSidebar';

interface BanlistBuilderPageProps { }

const BanlistBuilderPage: React.FC<BanlistBuilderPageProps> = () => {
    const navigate = useNavigate();
    const { banlistId } = useParams<{ banlistId?: string }>();

    // State management
    const [banlist, setBanlist] = useState<Banlist | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchResults, setSearchResults] = useState<Card[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
    const [draggedCard, setDraggedCard] = useState<Card | null>(null);

    // Banlist sections configuration
    const banlistSections: BanlistSection[] = [
        {
            title: 'Forbidden',
            type: 'forbidden',
            cards: banlist?.forbidden_cards || [],
            maxCopies: 0,
            color: 'text-red-700',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
        {
            title: 'Limited',
            type: 'limited',
            cards: banlist?.limited_cards || [],
            maxCopies: 1,
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200'
        },
        {
            title: 'Semi-Limited',
            type: 'semi_limited',
            cards: banlist?.semi_limited_cards || [],
            maxCopies: 2,
            color: 'text-orange-700',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200'
        },
        {
            title: 'Whitelist',
            type: 'whitelist',
            cards: banlist?.whitelist_cards || [],
            maxCopies: 3,
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        }
    ];

    // Load banlist on mount
    useEffect(() => {
        if (banlistId) {
            loadBanlist(banlistId);
        } else {
            // Create new banlist
            setBanlist({
                id: '',
                uuid: '',
                name: 'New Banlist',
                description: '',
                format_type: 'Custom',
                is_official: false,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                forbidden_cards: [],
                limited_cards: [],
                semi_limited_cards: [],
                whitelist_cards: []
            });
        }
    }, [banlistId]);

    // Initial card search
    useEffect(() => {
        handleSearch();
    }, []);

    const loadBanlist = async (id: string) => {
        setIsLoading(true);
        try {
            const loadedBanlist = await banlistService.getById(id);
            setBanlist(loadedBanlist);
        } catch (error) {
            console.error('Error loading banlist:', error);
            // Handle error (could show toast notification)
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (params: CardSearchParams = {}) => {
        setIsSearching(true);
        try {
            const response = await cardService.searchCards({
                limit: 100,
                ...params
            });
            setSearchResults(response.data || []);
        } catch (error) {
            console.error('Error searching cards:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const saveBanlist = async () => {
        if (!banlist) return;

        setIsSaving(true);
        try {
            let savedBanlist: Banlist;

            if (banlist.id) {
                // Update existing banlist
                savedBanlist = await banlistService.update(banlist.id, banlist);
            } else {
                // Create new banlist
                savedBanlist = await banlistService.create({
                    name: banlist.name,
                    description: banlist.description,
                    format_type: banlist.format_type,
                    is_official: banlist.is_official,
                    forbidden_cards: banlist.forbidden_cards,
                    limited_cards: banlist.limited_cards,
                    semi_limited_cards: banlist.semi_limited_cards,
                    whitelist_cards: banlist.whitelist_cards
                });
            }

            setBanlist(savedBanlist);
            // Show success notification
        } catch (error) {
            console.error('Error saving banlist:', error);
            // Handle error
        } finally {
            setIsSaving(false);
        }
    };

    const handleBanlistUpdate = (updatedBanlist: Partial<Banlist>) => {
        setBanlist(prev => prev ? { ...prev, ...updatedBanlist } : null);
    };

    const handleAddCardToSection = async (card: Card, sectionType: BanlistSection['type']) => {
        if (!banlist) return;

        try {
            // Update local state immediately for better UX
            const updatedBanlist = { ...banlist };

            // Remove card from all sections first
            updatedBanlist.forbidden_cards = updatedBanlist.forbidden_cards.filter(id => id !== card.id);
            updatedBanlist.limited_cards = updatedBanlist.limited_cards.filter(id => id !== card.id);
            updatedBanlist.semi_limited_cards = updatedBanlist.semi_limited_cards.filter(id => id !== card.id);
            updatedBanlist.whitelist_cards = updatedBanlist.whitelist_cards.filter(id => id !== card.id);

            // Add to new section
            switch (sectionType) {
                case 'forbidden':
                    updatedBanlist.forbidden_cards.push(card.id);
                    break;
                case 'limited':
                    updatedBanlist.limited_cards.push(card.id);
                    break;
                case 'semi_limited':
                    updatedBanlist.semi_limited_cards.push(card.id);
                    break;
                case 'whitelist':
                    updatedBanlist.whitelist_cards.push(card.id);
                    break;
            }

            setBanlist(updatedBanlist);

            // If banlist is saved, update on server
            if (banlist.id) {
                await banlistService.addCard(banlist.id, card.id, sectionType);
            }
        } catch (error) {
            console.error('Error adding card to banlist:', error);
            // Revert local state on error
            loadBanlist(banlist.id);
        }
    };

    const handleRemoveCardFromSection = async (cardId: number) => {
        if (!banlist) return;

        try {
            // Update local state immediately
            const updatedBanlist = { ...banlist };
            updatedBanlist.forbidden_cards = updatedBanlist.forbidden_cards.filter(id => id !== cardId);
            updatedBanlist.limited_cards = updatedBanlist.limited_cards.filter(id => id !== cardId);
            updatedBanlist.semi_limited_cards = updatedBanlist.semi_limited_cards.filter(id => id !== cardId);
            updatedBanlist.whitelist_cards = updatedBanlist.whitelist_cards.filter(id => id !== cardId);

            setBanlist(updatedBanlist);

            // If banlist is saved, update on server
            if (banlist.id) {
                await banlistService.removeCard(banlist.id, cardId);
            }
        } catch (error) {
            console.error('Error removing card from banlist:', error);
            // Revert local state on error
            if (banlist.id) {
                loadBanlist(banlist.id);
            }
        }
    };

    const handleImportBanlist = async (file: File) => {
        setIsLoading(true);
        try {
            const result = await banlistService.importFromFile(file);
            setBanlist(result.banlist);
            // Show success notification
        } catch (error) {
            console.error('Error importing banlist:', error);
            // Handle error
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportBanlist = async () => {
        if (!banlist?.id) return;

        try {
            await banlistService.downloadExport(
                banlist.id,
                `${banlist.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.lflist.conf`
            );
        } catch (error) {
            console.error('Error exporting banlist:', error);
            // Handle error
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading banlist...</div>
            </div>
        );
    }

    if (!banlist) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-red-600">Error loading banlist</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Left Sidebar - Card Search */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Card Search
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Drag cards to banlist sections
                    </p>
                </div>

                <CardSearchPanel
                    searchResults={searchResults}
                    onSearch={handleSearch}
                    isSearching={isSearching}
                    selectedCards={selectedCards}
                    onCardSelect={(cardId: number, selected: boolean) => {
                        const newSelected = new Set(selectedCards);
                        if (selected) {
                            newSelected.add(cardId);
                        } else {
                            newSelected.delete(cardId);
                        }
                        setSelectedCards(newSelected);
                    }}
                    onCardDragStart={(card: Card) => setDraggedCard(card)}
                    onCardDragEnd={() => setDraggedCard(null)}
                    viewMode={{ type: 'list', cardSize: 'small' }}
                    showBinderFilter={false} // Don't show binder filter for banlist builder
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <BanlistHeader
                    banlist={banlist}
                    onUpdate={handleBanlistUpdate}
                    onSave={saveBanlist}
                    onImport={handleImportBanlist}
                    onExport={handleExportBanlist}
                    isSaving={isSaving}
                />

                {/* Banlist Sections */}
                <div className="flex-1 overflow-auto">
                    <BanlistSections
                        sections={banlistSections}
                        draggedCard={draggedCard}
                        onAddCard={handleAddCardToSection}
                        onRemoveCard={handleRemoveCardFromSection}
                    />
                </div>
            </div>

            {/* Right Sidebar - Banlist Info */}
            <BanlistSidebar
                banlist={banlist}
                onNavigateBack={() => navigate('/banlist-manager')}
            />
        </div>
    );
};

export default BanlistBuilderPage;