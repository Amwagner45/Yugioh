import React, { useState, useEffect } from 'react';
import type { Binder } from '../../types';

interface BinderFormProps {
    binder?: Binder | null;
    onSubmit: (binderData: Omit<Binder, 'id' | 'cards' | 'createdAt' | 'modifiedAt'>) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

interface FormData {
    name: string;
    description: string;
    tags: string[];
}

interface FormErrors {
    name?: string;
    description?: string;
    tags?: string;
}

const BinderForm: React.FC<BinderFormProps> = ({
    binder,
    onSubmit,
    onCancel,
    isSubmitting = false,
}) => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        tags: [],
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [tagInput, setTagInput] = useState('');

    // Initialize form data when binder prop changes
    useEffect(() => {
        if (binder) {
            setFormData({
                name: binder.name,
                description: binder.description || '',
                tags: binder.tags || [],
            });
        } else {
            setFormData({
                name: '',
                description: '',
                tags: [],
            });
        }
    }, [binder]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validate name
        if (!formData.name.trim()) {
            newErrors.name = 'Binder name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Binder name must be at least 2 characters';
        } else if (formData.name.trim().length > 50) {
            newErrors.name = 'Binder name must be less than 50 characters';
        }

        // Validate description (optional but limit length)
        if (formData.description.length > 500) {
            newErrors.description = 'Description must be less than 500 characters';
        }

        // Validate tags
        if (formData.tags.length > 10) {
            newErrors.tags = 'Maximum 10 tags allowed';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSubmit({
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                tags: formData.tags.length > 0 ? formData.tags : undefined,
            });
        }
    };

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleAddTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tag],
            }));
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
    };

    const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                    {binder ? 'Edit Binder' : 'Create New Binder'}
                </h2>
                <p className="text-gray-600 mt-1">
                    {binder ? 'Update your binder information' : 'Create a new binder to organize your cards'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Binder Name */}
                <div>
                    <label htmlFor="binder-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Binder Name *
                    </label>
                    <input
                        id="binder-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="Enter binder name"
                        maxLength={50}
                        disabled={isSubmitting}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="binder-description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea
                        id="binder-description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.description ? 'border-red-500' : 'border-gray-300'
                            }`}
                        placeholder="Optional description for your binder"
                        rows={3}
                        maxLength={500}
                        disabled={isSubmitting}
                    />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                        {formData.description.length}/500 characters
                    </p>
                </div>

                {/* Tags */}
                <div>
                    <label htmlFor="binder-tags" className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                                    disabled={isSubmitting}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex">
                        <input
                            id="binder-tags"
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={handleTagInputKeyPress}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Add a tag"
                            disabled={isSubmitting || formData.tags.length >= 10}
                        />
                        <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim() || formData.tags.includes(tagInput.trim().toLowerCase()) || formData.tags.length >= 10 || isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    </div>
                    {errors.tags && (
                        <p className="mt-1 text-sm text-red-600">{errors.tags}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                        {formData.tags.length}/10 tags
                    </p>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        )}
                        {binder ? 'Update Binder' : 'Create Binder'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BinderForm;