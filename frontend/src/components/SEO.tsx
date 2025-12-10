import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    name?: string;
    type?: string;
    keywords?: string;
}

export const SEO: React.FC<SEOProps> = ({
    title,
    description = "TaskFlow - Streamline your project management with ease.",
    name = "TaskFlow",
    type = "website",
    keywords = "task management, project management, kanban, productivity, taskflow"
}) => {
    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{title} | {name}</title>
            <meta name='description' content={description} />
            <meta name="keywords" content={keywords} />

            {/* End standard metadata tags */}

            {/* Facebook tags */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            {/* End Facebook tags */}

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {/* End Twitter tags */}
        </Helmet>
    );
}
