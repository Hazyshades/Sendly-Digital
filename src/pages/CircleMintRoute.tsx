import React from 'react';
import { useLocation } from 'react-router-dom';

export const CircleMintRoute: React.FC = () => {
	const location = useLocation();
	const src = `/giftcard.html${location.search}`;
	return (
		<div style={{width:'100%', height:'100vh'}}>
			<iframe
				title="Circle Mint Gift Card"
				src={src}
				style={{border:'none', width:'100%', height:'100%'}}
			/>
		</div>
	);
};


