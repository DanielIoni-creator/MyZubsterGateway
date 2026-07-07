// src/pages/ReviewsPage.js
import React from 'react';
import { useParams } from 'react-router-dom';
import Reviews from '../components/Reviews/Reviews';
import { useAuth } from '../context/AuthContext';

const ReviewsPage = () => {
    const { targetId } = useParams();
    const { user } = useAuth();

    return (
        <div className="page-container">
            <h1>📝 Recensioni</h1>
            <Reviews 
                targetId={targetId}
                targetType="professional"
                currentUserId={user?.id || null}
            />
        </div>
    );
};

export default ReviewsPage;