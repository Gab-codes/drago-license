"use client";

import { useState } from "react";

const Page = () => {
  const [buttonText, setButtonText] = useState("Get Lost");

  const handleClick = () => {
    setButtonText("Are you deaf?? I said get lost!!!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-2xl text-center max-w-md">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">
          Unauthorized User
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 mb-6">
          There is nothing to see here.
        </p>
        <span
          id="getLost"
          className="inline-block px-6 py-3 bg-purple-600 text-white cursor-pointer rounded-full text-lg hover:bg-purple-700 transition duration-300"
          onClick={handleClick}
        >
          {buttonText}
        </span>
      </div>
    </div>
  );
};

export default Page;
