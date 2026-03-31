import React from "react";
import { Link } from "react-router-dom";
import { EffortWeightsCard } from "../components/EffortWeightsCard";
import { CategoryHoursCard } from "../components/CategoryHoursCard";

export function HomePage() {
  return (
    <>
      <section className="hero hero-home">
        <div>
      
          <h1>Progress Reviews</h1>
         
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" to="/review-plan">Review Plan</Link>
          <Link className="primary-button" to="/table">Open Table</Link>
        </div>
      </section>

      <section className="home-grid">
        <EffortWeightsCard />
        <CategoryHoursCard />
      </section>
    </>
  );
}
